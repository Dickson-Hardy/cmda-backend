require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🔧 Testing SMTP Email Configuration...\n');

  // Show configuration (hide password)
  console.log('Configuration:');
  console.log('  HOST:', process.env.EMAIL_HOST || '❌ Not set');
  console.log('  USER:', process.env.EMAIL_USER || '❌ Not set');
  console.log('  PASS:', process.env.EMAIL_PASS ? '✅ Set (hidden)' : '❌ Not set');
  console.log('  FROM:', process.env.EMAIL_FROM || '❌ Not set');
  console.log('\n');

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('📡 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'dicksonhardy7@gmail.com', // Send to specified address
      subject: 'CMDA Email Service Test - ' + new Date().toLocaleString(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">✅ Email Service Test Successful!</h2>
          <p>This is a test email from your CMDA Backend email service.</p>
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Test Details:</h3>
            <ul>
              <li><strong>Provider:</strong> Nodemailer (SMTP)</li>
              <li><strong>Server:</strong> ${process.env.EMAIL_HOST}</li>
              <li><strong>From:</strong> ${process.env.EMAIL_FROM}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p style="color: #666; font-size: 12px;">
            If you received this email, your SMTP configuration is working correctly! 🎉
          </p>
        </div>
      `,
      text: 'CMDA Email Service Test - If you received this, your SMTP is working!',
    });

    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n✅ All tests passed! Your email service is working correctly.');
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('   Error:', error.message);

    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Check:');
      console.error('   - EMAIL_USER and EMAIL_PASS are correct');
      console.error('   - If using Gmail, enable "App Passwords" (not regular password)');
      console.error('   - If using Gmail, enable "Less secure app access" or use App Password');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('\n💡 Connection failed. Check:');
      console.error('   - EMAIL_HOST is correct');
      console.error('   - Your firewall/network allows port 465');
      console.error('   - Internet connection is stable');
    }

    process.exit(1);
  } finally {
    transporter.close();
  }
}

testEmail();
