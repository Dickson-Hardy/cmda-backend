export type LifetimeMembershipSource = 'payment' | 'admin';

interface LifetimeMembershipTemplateOptions {
  name: string;
  source: LifetimeMembershipSource;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character],
  );

const normalizeDoctorName = (name: string): string => {
  const trimmedName = name.trim() || 'Member';
  return /^(dr|doctor)\.?\s/i.test(trimmedName) ? trimmedName : `Dr. ${trimmedName}`;
};

export const buildLifetimeMembershipEmail = ({
  name,
  source,
}: LifetimeMembershipTemplateOptions): { html: string; text: string } => {
  const recipientName = escapeHtml(normalizeDoctorName(name));
  const isPayment = source === 'payment';

  const opening = isPayment
    ? `On behalf of the entire leadership and membership of Christian Medical and Dental Association Nigeria (CMDA Nigeria), please accept our most sincere appreciation for your extraordinary generosity toward the CMDA Nigeria Impact Fund.`
    : `On behalf of the entire leadership and membership of Christian Medical and Dental Association Nigeria (CMDA Nigeria), please accept our most sincere appreciation as you are welcomed into CMDA Nigeria Lifetime Membership.`;
  const recognition = isPayment
    ? `What you have done is far more than a financial contribution; it is a profound act of worship and a tangible expression of your love for God and for the people He has called us to serve.`
    : `This recognition is far more than an account update; it affirms your valued and permanent place in the CMDA Nigeria family and our shared commitment to the people God has called us to serve.`;
  const commitment = isPayment
    ? `Giving at this level represents not just resources, but trust in this vision and trust that God will honour what is offered in His name. That trust humbles us deeply, and we carry it with great responsibility.`
    : `Lifetime membership represents trust in this vision and in the work God has entrusted to CMDA Nigeria. That trust humbles us deeply, and we carry it with great responsibility.`;

  const paragraphs = [
    'Greetings in the name of our Lord and Saviour Jesus Christ.',
    `It is with hearts full of gratitude that we write to you today. ${opening}`,
    recognition,
    isPayment
      ? 'We do not take your sacrifice lightly.'
      : 'We do not take your commitment lightly.',
    commitment,
    `Your partnership is already at work, in the hands of healthcare professionals serving with greater confidence, in communities being reached with compassionate care, and in the next generation of Christ-centred professionals being shaped for impact. Every life touched through this work bears, in part, the fingerprint of your faithfulness.`,
    `In recognition of your remarkable partnership, we are honoured to present you with the CMDA Nigeria Lifetime Membership Certificate. It serves as a symbol of your cherished and permanent place within the CMDA Nigeria family.`,
    `We pray that God will prosper your practice, strengthen your household, and continue to enlarge your capacity to be a blessing. May you see with your own eyes the fruit of what you have sown.`,
    'Thank you, Sir.',
  ];

  const htmlParagraphs = paragraphs
    .map(
      (paragraph) =>
        `<p style="color: #4b4b4b; font-size: 16px; line-height: 1.7; margin: 0 0 18px">${paragraph}</p>`,
    )
    .join('');

  return {
    html: `
<div style="margin: 0; padding: 0; background-color: #f4eef2; font-family: Arial, Helvetica, sans-serif">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="background-color: #f4eef2; padding: 24px 12px">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden">
          <tr>
            <td align="center" style="background-color: #994279; padding: 30px 24px">
              <img src="https://cmdanigeria.net/CMDALOGO_white.png" alt="CMDA Nigeria" width="190" style="display: block; width: 190px; max-width: 100%; height: auto" />
              <h1 style="color: #ffffff; font-size: 24px; line-height: 1.3; margin: 20px 0 0">With Deepest Gratitude</h1>
              <p style="color: #f7eaf2; font-size: 15px; margin: 8px 0 0">CMDA Nigeria Lifetime Membership</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 30px">
              <h2 style="color: #282828; font-size: 21px; line-height: 1.4; margin: 0 0 22px">Dear ${recipientName},</h2>
              ${htmlParagraphs}
              <p style="color: #4b4b4b; font-size: 16px; line-height: 1.7; margin: 30px 0 0">
                With deepest gratitude,<br />
                His Servant and Yours,<br /><br />
                <strong>Prof. Chima Onoka</strong><br />
                CEO, CMDA Nigeria
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f7f4f6; padding: 18px 24px">
              <p style="color: #767676; font-size: 13px; line-height: 1.5; margin: 0">CMDA Nigeria · Wholeness House, Gwagwalada, FCT, Nigeria</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`,
    text: [
      `Dear ${normalizeDoctorName(name)},`,
      '',
      ...paragraphs.flatMap((paragraph) => [paragraph, '']),
      'With deepest gratitude,',
      'His Servant and Yours,',
      '',
      'Prof. Chima Onoka',
      'CEO, CMDA Nigeria',
    ].join('\n'),
  };
};
