const nodemailer = require('nodemailer');

function createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
}

function sendBookingConfirmationEmail(db, bookingId, callback = () => {}) {
    if (!bookingId) return callback(null, { sent: false, reason: 'missing_booking_id' });

    db.get(
        `SELECT b.*, u.name AS providerName, r.type AS roomType, r.meeting_link AS roomMeetingLink
         FROM bookings b
         LEFT JOIN users u ON b.providerId = u.id
         LEFT JOIN rooms r ON b.roomId = r.id
         WHERE b.id = ?`,
        [bookingId],
        (err, booking) => {
            if (err || !booking) {
                return callback(err || new Error('Booking not found'));
            }
            if (booking.status !== 'Paid' || !booking.clientEmail) {
                return callback(null, { sent: false, reason: 'not_paid_or_missing_email' });
            }
            if (Number(booking.confirmation_email_sent) === 1) {
                return callback(null, { sent: false, reason: 'already_sent' });
            }

            // Atomic lock to prevent duplicate emails from concurrent webhook and polling
            db.run(
                'UPDATE bookings SET confirmation_email_sent = 1 WHERE id = ? AND COALESCE(confirmation_email_sent, 0) = 0',
                [bookingId],
                function (lockErr) {
                    if (lockErr) return callback(lockErr);
                    if (this.changes === 0) {
                        return callback(null, { sent: false, reason: 'already_sent' });
                    }

                    db.all('SELECT key, value FROM content WHERE key IN (?, ?, ?)', ['contactAddress', 'contactEmail', 'contactPhone'], async (contentErr, rows) => {
                        const contentMap = {};
                        if (!contentErr && Array.isArray(rows)) {
                            rows.forEach(r => { contentMap[r.key] = r.value; });
                        }

                        const contactEmail = contentMap.contactEmail || 'contacto@centropsicarte.cl';
                        const contactPhone = contentMap.contactPhone || '+56961676706';
                        const contactAddress = contentMap.contactAddress || 'Oficina Virtual Las Bellotas 199, Providencia, RM';

                        const isVirtual = booking.roomType === 'Virtual' || /virtual|zoom|online/i.test(booking.roomName || '');
                        const meetingLink = (booking.roomMeetingLink || '').trim();

                        const locationLabel = isVirtual ? 'Enlace de Atención Online' : 'Dirección de Atención Presencial';
                        const locationValue = isVirtual
                            ? (meetingLink || `Se enviará a tu correo desde ${contactEmail} minutos antes de la sesión.`)
                            : contactAddress;

                        const locationHtml = isVirtual && meetingLink
                            ? `<p><strong>${locationLabel}:</strong> <a href="${meetingLink}" target="_blank" rel="noopener noreferrer">${meetingLink}</a></p>`
                            : `<p><strong>${locationLabel}:</strong> ${locationValue}</p>`;

                        const fromAddress = process.env.SMTP_FROM || `"Centro Integral PsicArte" <${contactEmail}>`;
                        const subject = `Confirmación de Reserva - ${booking.serviceName} (${booking.date})`;

                        const textBody = [
                            `Hola ${booking.clientName || 'Paciente'},`,
                            '',
                            'Tu reserva y pago en Centro Integral PsicArte han sido confirmados exitosamente.',
                            '',
                            'DETALLES DE TU CITA:',
                            `- Código de Reserva: ${booking.id}`,
                            `- Servicio: ${booking.serviceName}`,
                            `- Profesional: ${booking.providerName || 'Equipo PsicArte'}`,
                            `- Fecha: ${booking.date}`,
                            `- Horario: ${booking.startTime} a ${booking.endTime} hrs`,
                            `- Modalidad / Sala: ${booking.roomName || (isVirtual ? 'Online' : 'Presencial')}`,
                            `- ${locationLabel}: ${locationValue}`,
                            '',
                            `Si tienes dudas o consultas, escríbenos a ${contactEmail} o al teléfono/WhatsApp ${contactPhone}.`,
                            '',
                            'Atentamente,',
                            'Centro Integral PsicArte'
                        ].join('\n');

                        const htmlBody = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid currentColor; border-radius: 12px;">
                                <h2>Confirmación de Reserva — Centro Integral PsicArte</h2>
                                <p>Hola <strong>${booking.clientName || 'Paciente'}</strong>,</p>
                                <p>Tu pago ha sido validado y tu hora de atención quedó confirmada en nuestro sistema.</p>
                                <hr>
                                <h3>Detalles de tu Cita</h3>
                                <ul>
                                    <li><strong>Código de Reserva:</strong> ${booking.id}</li>
                                    <li><strong>Servicio:</strong> ${booking.serviceName}</li>
                                    <li><strong>Profesional:</strong> ${booking.providerName || 'Equipo PsicArte'}</li>
                                    <li><strong>Fecha:</strong> ${booking.date}</li>
                                    <li><strong>Horario:</strong> ${booking.startTime} - ${booking.endTime} hrs</li>
                                    <li><strong>Modalidad / Sala:</strong> ${booking.roomName || (isVirtual ? 'Online' : 'Presencial')}</li>
                                </ul>
                                ${locationHtml}
                                <hr>
                                <p><small>Contacto: ${contactEmail} | Teléfono / WhatsApp: ${contactPhone}</small></p>
                            </div>
                        `;

                        const transporter = createTransporter();
                        if (!transporter) {
                            console.log(`[Mailer] (Modo sin SMTP configurado) Confirmación generada para ${booking.clientEmail} | Reserva ${booking.id} | ${locationLabel}: ${locationValue}`);
                            return callback(null, { sent: true, simulated: true });
                        }

                        try {
                            await transporter.sendMail({
                                from: fromAddress,
                                to: booking.clientEmail,
                                replyTo: contactEmail,
                                subject,
                                text: textBody,
                                html: htmlBody
                            });
                            console.log(`[Mailer] Correo de confirmación enviado a ${booking.clientEmail} (Reserva ${booking.id}).`);
                            return callback(null, { sent: true, simulated: false });
                        } catch (sendErr) {
                            console.error(`[Mailer] Error enviando correo para reserva ${booking.id}:`, sendErr.message);
                            db.run('UPDATE bookings SET confirmation_email_sent = 0 WHERE id = ?', [bookingId]);
                            return callback(sendErr);
                        }
                    });
                }
            );
        }
    );
}

module.exports = { sendBookingConfirmationEmail };

