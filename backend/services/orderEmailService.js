const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Generic mail sender with error logging
 */
async function sendMailSafe(to, subject, html) {
  if (!to || !to.includes('@')) {
    console.log(`[OrderEmailService] Skipped email to invalid address: ${to}`);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"CanopyGuard Eco-Store" <${process.env.EMAIL_USER || 'no-reply@canopyguard.gov.in'}>`,
      to,
      subject,
      html
    });
    console.log(`[OrderEmailService] Email sent successfully to ${to} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[OrderEmailService] Error sending email to ${to}:`, err.message);
  }
}

/**
 * 1. Order Placed Confirmation Email
 */
async function sendOrderPlacedEmail(order) {
  const itemsHtml = (order.items || []).map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${item.productName} (${item.unitSize || 'Standard'})</td>
      <td style="padding: 10px 0; text-align: center; color: #475569;">x${item.quantity}</td>
      <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #166534;">₹${item.totalItemInr || 0}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #064e3b 0%, #059669 100%); color: #ffffff; padding: 30px 24px; text-align: center; }
        .content { padding: 24px; color: #334155; }
        .badge { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #166534; font-weight: 700; border-radius: 999px; font-size: 13px; }
        .box { background: #f8fafc; border-radius: 12px; padding: 16px; margin: 18px 0; border: 1px solid #e2e8f0; }
        .footer { text-align: center; padding: 16px; color: #94a3b8; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.5px;">🌿 Order Confirmed!</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Thank you for supporting municipal urban compost & circular forestry.</p>
        </div>
        <div class="content">
          <p>Hi <b>${order.userName || 'Citizen'}</b>,</p>
          <p>We've received your order <b>${order.orderNumber}</b> and it is being prepared for fulfillment at the Municipal Biomass Processing Center.</p>
          
          <div class="box">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b; font-size: 13px;">ORDER NUMBER</span>
              <span class="badge">${order.orderNumber}</span>
            </div>
            <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">FULFILLMENT TYPE: <b>${order.fulfillmentType}</b></div>
            <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">PAYMENT METHOD: <b>${order.paymentMethod}</b> (${order.paymentStatus})</div>
            ${order.fulfillmentType === 'Home Delivery' ? `
              <div style="font-size: 13px; color: #64748b; margin-top: 8px;">
                <b>Delivery Destination:</b><br/>
                ${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.city || 'Udupi'} - ${order.deliveryAddress?.postalCode || '576101'}<br/>
                Slot: ${order.deliveryAddress?.preferredSlot || 'Standard Delivery'}
              </div>
            ` : `
              <div style="font-size: 13px; color: #64748b; margin-top: 8px;">
                <b>Yard Pickup Location:</b><br/>
                ${order.pickupYard?.yardName || 'Municipal Biomass Yard'}<br/>
                Pickup Pass Code: <b style="color: #059669; font-size: 16px;">${order.pickupYard?.pickupPassCode || 'PASS-ECO'}</b>
              </div>
            `}
          </div>

          <h3 style="margin: 20px 0 10px 0; font-size: 16px; color: #0f172a;">Items in Your Order</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 2px solid #cbd5e1; text-align: left; color: #64748b; font-size: 12px;">
                <th style="padding-bottom: 8px;">PRODUCT</th>
                <th style="padding-bottom: 8px; text-align: center;">QTY</th>
                <th style="padding-bottom: 8px; text-align: right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding-top: 14px; font-weight: 700; color: #0f172a; font-size: 15px;">Grand Total</td>
                <td style="padding-top: 14px; text-align: right; font-weight: 800; color: #059669; font-size: 18px;">₹${order.totalAmountInr || 0}</td>
              </tr>
              ${order.totalEcoPointsUsed > 0 ? `
                <tr>
                  <td colspan="2" style="color: #64748b; font-size: 12px;">Eco-Points Redeemed</td>
                  <td style="text-align: right; color: #059669; font-size: 12px; font-weight: 700;">-${order.totalEcoPointsUsed} pts</td>
                </tr>
              ` : ''}
            </tfoot>
          </table>

          ${order.deliveryOtp ? `
            <div style="margin-top: 20px; padding: 14px; background: #ecfdf5; border: 1px dashed #10b981; border-radius: 12px; text-align: center;">
              <span style="font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase;">Your Delivery Security OTP</span>
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #047857; margin-top: 4px;">${order.deliveryOtp}</div>
              <small style="color: #047857; font-size: 11px;">Share this OTP with your delivery partner only upon receiving your compost items.</small>
            </div>
          ` : ''}
        </div>
        <div class="footer">
          CanopyGuard Urban Forestry & Bio-Waste Valorization System • Udupi City Municipality
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMailSafe(order.userEmail, `[CanopyGuard] Order Confirmed: ${order.orderNumber}`, html);
}

/**
 * 2. Order Assigned to Delivery Partner Email
 */
async function sendOrderAssignedEmail(order, partner) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 26px 24px; text-align: center; }
        .content { padding: 24px; color: #334155; }
        .partner-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .footer { text-align: center; padding: 16px; color: #94a3b8; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 style="margin: 0; font-size: 22px;">🚴 Delivery Partner Assigned</h1>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Order ${order.orderNumber}</p>
        </div>
        <div class="content">
          <p>Hi <b>${order.userName || 'Citizen'}</b>,</p>
          <p>Good news! Your CanopyGuard compost & eco-store order has been assigned to our municipal green logistics partner for dispatch.</p>
          
          <div class="partner-box">
            <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Assigned Delivery Executive</h4>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${partner?.name || order.assignedDeliveryPartnerName || 'Municipal Delivery Partner'}</div>
            <div style="font-size: 13px; color: #475569; margin-top: 4px;">📞 Contact: <b>${partner?.phone || order.assignedDeliveryPartnerPhone || 'Available upon pickup'}</b></div>
            <div style="font-size: 13px; color: #475569; margin-top: 2px;">🛵 EV Cargo Vehicle: <b>${partner?.vehicleNumber || order.assignedDeliveryPartnerVehicle || 'EV Green Cargo'}</b></div>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Your delivery partner is currently routing to the Municipal Biomass Processing Yard to load your organic products. You will receive a live dispatch alert as soon as they are on the way!
          </p>
        </div>
        <div class="footer">
          CanopyGuard Green Logistics • Urban Bio-Waste Transformation
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMailSafe(order.userEmail, `[CanopyGuard] Delivery Partner Assigned for Order ${order.orderNumber}`, html);
}

/**
 * 3. Out for Delivery Alert Email (with live ETA & OTP)
 */
async function sendOutForDeliveryEmail(order, partner, etaMinutes = 25) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: #ffffff; padding: 26px 24px; text-align: center; }
        .content { padding: 24px; color: #334155; }
        .otp-box { background: #fef3c7; border: 2px dashed #f59e0b; border-radius: 12px; padding: 18px; text-align: center; margin: 18px 0; }
        .footer { text-align: center; padding: 16px; color: #94a3b8; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 style="margin: 0; font-size: 22px;">🚚 Out for Delivery!</h1>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Your organic compost & garden products are on the way!</p>
        </div>
        <div class="content">
          <p>Hi <b>${order.userName || 'Citizen'}</b>,</p>
          <p>Your order <b>${order.orderNumber}</b> has been picked up from the municipal processing yard and is now <b>out for delivery</b> to your address.</p>

          <div style="background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 14px 0;">
            <div style="font-size: 13px; color: #64748b;">ESTIMATED ARRIVAL TIME</div>
            <div style="font-size: 20px; font-weight: 800; color: #d97706;">Approx. ${etaMinutes} Minutes</div>
            <div style="font-size: 13px; color: #334155; margin-top: 6px;">
              <b>Driver:</b> ${order.assignedDeliveryPartnerName || 'Green Logistics Partner'} (${order.assignedDeliveryPartnerPhone || 'Active'})
            </div>
            ${order.paymentMethod === 'Cash on Delivery' && order.paymentStatus !== 'Paid' ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #b45309; font-weight: 700; font-size: 13px;">
                💵 Cash to Collect upon Delivery: ₹${order.totalAmountInr}
              </div>
            ` : `
              <div style="margin-top: 6px; color: #059669; font-size: 12px; font-weight: 600;">
                ✅ Order is Paid Online via ${order.paymentMethod}. No cash payment needed.
              </div>
            `}
          </div>

          <div class="otp-box">
            <span style="font-size: 12px; color: #92400e; font-weight: 700; text-transform: uppercase;">Handover Security OTP</span>
            <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #78350f; margin: 6px 0;">${order.deliveryOtp || '9041'}</div>
            <span style="font-size: 12px; color: #92400e;">Please provide this code to the delivery executive when they reach your doorstep.</span>
          </div>
        </div>
        <div class="footer">
          CanopyGuard Real-Time Green Delivery • Municipal Forestry Desk
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMailSafe(order.userEmail, `[CanopyGuard] Out for Delivery: Order ${order.orderNumber} is on the way!`, html);
}

/**
 * 4. Delivered Confirmation Email
 */
async function sendDeliveredEmail(order, proofUrl) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; padding: 30px 24px; text-align: center; }
        .content { padding: 24px; color: #334155; }
        .box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center; }
        .footer { text-align: center; padding: 16px; color: #94a3b8; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🎉 Order Delivered!</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Your compost & gardening supplies have been successfully delivered.</p>
        </div>
        <div class="content">
          <p>Hi <b>${order.userName || 'Citizen'}</b>,</p>
          <p>Your order <b>${order.orderNumber}</b> was completed on <b>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</b>.</p>
          
          <div class="box">
            <span style="font-size: 13px; color: #166534; font-weight: 700;">DELIVERY STATUS: COMPLETED & VERIFIED</span>
            <div style="font-size: 14px; color: #166534; margin-top: 4px;">Delivered by ${order.assignedDeliveryPartnerName || 'Municipal Green Partner'}</div>
          </div>

          ${proofUrl ? `
            <div style="margin: 16px 0; text-align: center;">
              <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 6px;">Delivery Handover Proof:</span>
              <img src="${proofUrl}" alt="Delivery Proof" style="max-width: 100%; max-height: 220px; border-radius: 10px; border: 1px solid #e2e8f0; object-fit: cover;" />
            </div>
          ` : ''}

          <p style="font-size: 13px; color: #475569; line-height: 1.5;">
            By choosing municipal compost created from recycled urban tree trimmings, you have helped divert organic biomass from city landfills and enriched our local soil! 🌳
          </p>
        </div>
        <div class="footer">
          Thank you for being an active participant in our city's Green Circular Economy.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMailSafe(order.userEmail, `[CanopyGuard] Order Delivered: ${order.orderNumber}`, html);
}

module.exports = {
  sendOrderPlacedEmail,
  sendOrderAssignedEmail,
  sendOutForDeliveryEmail,
  sendDeliveredEmail
};
