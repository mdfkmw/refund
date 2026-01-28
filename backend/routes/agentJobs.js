// backend/routes/agentJobs.js
const express = require('express');
const db = require('../db');
const router = express.Router();

// helper pentru a extrage rows din diverse forme (mysql2 / mysql / pg wrapper)
function extractRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) return result[0];
    return result;
  }
  if (result.rows) return result.rows;
  return [];
}

// POST /api/agent/jobs/:id/report
router.post('/agent/jobs/:id/report', async (req, res) => {
  console.log("[DBG][BACKEND] REPORT RECEIVED job#", req.params.id, "body=", req.body);

  try {
    const jobId = Number(req.params.id);
    if (!jobId) {
      return res.status(400).json({ error: 'jobId invalid' });
    }

    const {
      success = false,
      pos_ok = false,
      fiscal_ok = false,
      error_message = null,
      result = null,
    } = req.body || {};

    // 1) luăm jobul
    const jobRes = await db.query(
      `SELECT id, reservation_id, payment_id, job_type, status, payload
         FROM agent_jobs
        WHERE id = ?
        LIMIT 1`,
      [jobId]
    );
    const jobRows = extractRows(jobRes);
    const job = jobRows[0];

    if (!job) {
      return res.status(404).json({ error: 'Job inexistent' });
    }

    // 2) actualizăm agent_jobs
// IMPORTANT: statusurile din DB sunt: queued | in_progress | done | error
const newJobStatus = success ? 'done' : 'error';


    await db.query(
      `UPDATE agent_jobs
          SET status = ?,
              result = ?,
              error_message = ?
        WHERE id = ?`,
      [
        newJobStatus,
        result ? JSON.stringify(result) : null,
        error_message || null,
        jobId,
      ]
    );

    // 3) dacă jobul este legat de un payment, actualizăm și payments
    if (job.job_type === 'card_refund') {
      const payload = (() => {
        try {
          return job.payload ? JSON.parse(job.payload) : null;
        } catch {
          return null;
        }
      })();

      const refundId = Number(payload?.refund_id || 0) || null;
      const posPayload = result?.pos ? JSON.stringify(result.pos) : null;

      if (refundId) {
        await db.query(
          `UPDATE payment_refunds
              SET status = ?,
                  processed_at = NOW(),
                  provider_payload = ?,
                  reason = ?
            WHERE id = ?`,
          [success ? 'succeeded' : 'failed', posPayload, error_message || null, refundId]
        );
      }

      if (success && job.payment_id) {
        await db.query(`UPDATE payments SET status = 'refunded' WHERE id = ?`, [job.payment_id]);
        if (job.reservation_id) {
          await db.query(
            `UPDATE reservations
                SET status = 'cancelled',
                    version = version + 1
              WHERE id = ?`,
            [job.reservation_id]
          );
          await db.query(
            `INSERT INTO reservation_events (reservation_id, action, actor_id, details)
             VALUES (?, 'refund', NULL, ?)`,
            [
              job.reservation_id,
              JSON.stringify({
                source: 'pos_refund',
                refund_id: refundId,
                payment_id: job.payment_id,
              }),
            ]
          );
        }
      }

      return res.json({ ok: true });
    }

    if (job.payment_id) {
      const payload = (() => {
        try {
          return job.payload ? JSON.parse(job.payload) : null;
        } catch {
          return null;
        }
      })();

      if (pos_ok && result?.pos && (job.job_type === 'card_and_receipt' || job.job_type === 'retry_receipt')) {
        const posMeta = {
          unique_id: payload?.pos_unique_id || payload?.unique_id || payload?.payment_id || null,
          tags: result?.pos?.tags || null,
          hostResp: result?.pos?.hostResp || null,
          errorCode: result?.pos?.errorCode || null,
        };
        await db.query(
          `UPDATE payments
              SET provider_transaction_id = ?
            WHERE id = ?`,
          [JSON.stringify(posMeta), job.payment_id]
        );
      }
  // Default: dacă job-ul a eșuat, plata devine FAILED (Așa ai ales tu pentru CASH)
  let paymentStatus = success ? null : 'failed';
  let receiptStatus = 'none';

  if (success) {
    if (fiscal_ok && (pos_ok || job.job_type === 'cash_receipt_only')) {
      // totul OK: bani + bon
      paymentStatus = 'paid';
      receiptStatus = 'ok';
    } else if (pos_ok && !fiscal_ok && job.job_type !== 'cash_receipt_only') {
      // CARD: banii luați, bon lipsă
      paymentStatus = 'pos_ok_waiting_receipt';
      receiptStatus = 'error_needs_retry';
    } else {
      // combinație ciudată => considerăm failed
      paymentStatus = 'failed';
      receiptStatus = 'none';
    }
  } else {
    // success=false

    if (job.job_type === 'cash_receipt_only' && !fiscal_ok) {
      // CASH: bon eșuat => FAILED + permite retry bon
      paymentStatus = 'failed';
      receiptStatus = 'error_needs_retry';
    } else if (pos_ok && !fiscal_ok && job.job_type !== 'cash_receipt_only') {
      // CARD: POS OK, bon lipsă
      paymentStatus = 'pos_ok_waiting_receipt';
      receiptStatus = 'error_needs_retry';
    } else {
      // CARD declined / device error => FAILED (final)
      paymentStatus = 'failed';
      receiptStatus = 'none';
    }
  }

  // IMPORTANT: update-ul se face MEREU (nu mai depinde de "if(paymentStatus)")
  await db.query(
    `UPDATE payments
        SET status = ?,
            receipt_status = ?
      WHERE id = ?`,
    [paymentStatus, receiptStatus, job.payment_id]
  );
}


    return res.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/agent/jobs/:id/report] eroare:', err);
    return res.status(500).json({ error: 'Eroare la procesarea raportului de job' });
  }
});

module.exports = router;
