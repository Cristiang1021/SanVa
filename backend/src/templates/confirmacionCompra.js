const path = require('path');

const COLOR = '#FF0013';
const ASSETS = path.join(__dirname, '../../assets/email');

const REDES = [
  {
    key: 'instagram',
    file: 'instagram.png',
    cid: 'ig@sanva',
    alt: 'Instagram',
    href: (u) => `https://instagram.com/${u}`
  },
  {
    key: 'facebook',
    file: 'facebook.png',
    cid: 'fb@sanva',
    alt: 'Facebook',
    href: (u) => `https://facebook.com/${u}`
  },
  {
    key: 'tiktok',
    file: 'tiktok.png',
    cid: 'tt@sanva',
    alt: 'TikTok',
    href: (u) => `https://tiktok.com/@${u}`
  },
  {
    key: 'youtube',
    file: 'youtube.png',
    cid: 'yt@sanva',
    alt: 'YouTube',
    href: (u) => `https://youtube.com/@${u}`
  },
  {
    key: 'twitter',
    file: 'x.png',
    cid: 'x@sanva',
    alt: 'X',
    href: (u) => `https://x.com/${u}`
  }
];

const escapeHtml = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const hrefRed = (valor, builder) => {
  const v = String(valor || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return builder(v.replace(/^@/, ''));
};

const fila = (label, value, extraTd = '', extraVal = '') => {
  if (!value) return '';
  return `
    <tr>
      <td style="color:#999999;${extraTd}">${label}</td>
      <td style="font-weight:bold; text-align:right;${extraVal}">${escapeHtml(value)}</td>
    </tr>`;
};

const armarRedes = (config = {}) => {
  const activas = [];
  const attachments = [];

  for (const red of REDES) {
    const href = hrefRed(config[red.key], red.href);
    if (!href) continue;
    activas.push(`
      <td style="padding:0 8px;" align="center">
        <a href="${escapeHtml(href)}" target="_blank" style="text-decoration:none;">
          <img src="cid:${red.cid}" width="40" height="40" alt="${red.alt}" style="display:block; border:0; border-radius:50%;" />
        </a>
      </td>`);
    attachments.push({
      filename: red.file,
      path: path.join(ASSETS, red.file),
      cid: red.cid
    });
  }

  if (!activas.length) return { html: '', attachments: [] };

  return {
    html: `
      <tr>
        <td align="center" style="padding:30px 50px 10px 50px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              ${activas.join('')}
            </tr>
          </table>
        </td>
      </tr>`,
    attachments
  };
};

const formatearFecha = (fecha) => {
  if (!fecha) return '';
  try {
    return new Date(fecha).toLocaleString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(fecha);
  }
};

const construirConfirmacionCompra = ({ cliente, email, datos, config = {} }) => {
  const redes = armarRedes(config);
  const telefono = datos.telefono || datos.cliente_tel || '';
  const asientos = datos.asientos || datos.asiento || '';
  const contactoEmail = config.contacto_email || config.smtp_email || '';
  const contactoTel = config.contacto_telefono || '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Confirmación de compra</title>
</head>
<body style="margin:0; padding:0; background-color:#e5e5e5; font-family:Arial, Helvetica, sans-serif;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    Tu compra fue confirmada. Aquí tienes el detalle de tus asientos.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e5e5e5; padding:30px 0;">
    <tr>
      <td align="center">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:6px; overflow:hidden;">

          <tr>
            <td style="background-color:#000000; padding:28px 30px 26px 30px;" align="center">
              <img src="cid:logo@sanva" width="240" alt="Sanva Shows" style="display:block; border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:${COLOR}; height:6px; font-size:0; line-height:6px;">&nbsp;</td>
          </tr>

          <tr>
            <td align="center" style="padding:40px 30px 0 30px;">
              <p style="margin:0; font-size:30px; font-weight:800; color:${COLOR}; letter-spacing:1px;">GRACIAS</p>
              <p style="margin:4px 0 0 0; font-size:20px; font-weight:800; color:#222222; letter-spacing:1px;">POR TU COMPRA</p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px 50px 10px 50px;">
              <p style="margin:0; font-size:14px; color:#888888; line-height:22px;">
                ¡No nos cansaremos de agradecerte tu apoyo! Aquí tienes el resumen de tu compra y los asientos que seleccionaste para la función.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 50px 10px 50px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f7; border-radius:8px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="font-size:14px; color:#444444;">
                      ${fila('Nombre', cliente)}
                      ${fila('Correo', email)}
                      ${fila('Teléfono', telefono)}
                      ${fila('Evento', datos.evento)}
                      ${fila('Lugar', datos.lugar)}
                      ${fila('Fecha', formatearFecha(datos.funcion || datos.fecha))}
                      ${fila('Método de pago', datos.metodo_pago)}
                      ${fila('Referencia', datos.referencia_pago)}
                      ${fila(
                        'Asientos seleccionados',
                        asientos,
                        ' border-top:1px solid #e2e2e2; padding-top:12px;',
                        ` border-top:1px solid #e2e2e2; padding-top:12px; color:${COLOR};`
                      )}
                      ${typeof datos.precio === 'number' ? fila('Total', `$${Number(datos.precio).toFixed(2)}`) : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${redes.html}

          <tr>
            <td style="background-color:${COLOR}; height:6px; font-size:0; line-height:6px;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="background-color:#000000; padding:28px 30px 26px 30px;">
              <p style="margin:0 0 18px 0; font-size:16px; font-weight:800; color:#ffffff; letter-spacing:0.5px;">¡Te esperamos en la función!</p>
              <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td align="center">
                    <img src="cid:valentin@sanva" width="168" height="184" alt="Valentin" style="display:block; border:0;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:${COLOR}; height:6px; font-size:0; line-height:6px;">&nbsp;</td>
          </tr>

          <tr>
            <td align="center" style="padding:16px 40px 32px 40px;">
              <p style="margin:0; font-size:12px; color:#999999;">
                ¿Algo no cuadra? Escríbenos${contactoEmail ? ` a <a href="mailto:${escapeHtml(contactoEmail)}" style="color:#999999;">${escapeHtml(contactoEmail)}</a>` : ''}${contactoTel ? ` o llámanos al ${escapeHtml(contactoTel)}` : ''}.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

  return {
    html,
    attachments: [
      {
        filename: 'logo-sanva-shows.png',
        path: path.join(ASSETS, 'logo-sanva-shows.png'),
        cid: 'logo@sanva'
      },
      {
        filename: 'valentin.png',
        path: path.join(ASSETS, 'valentin.png'),
        cid: 'valentin@sanva'
      },
      ...redes.attachments
    ]
  };
};

module.exports = { construirConfirmacionCompra };
