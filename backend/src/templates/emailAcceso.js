const path = require('path');

const COLOR = '#FF0013';
const ASSETS = path.join(__dirname, '../../assets/email');

const escapeHtml = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const construirEmailAcceso = ({
  titulo,
  saludo,
  mensaje,
  botonTexto,
  botonUrl,
  aviso = 'Si no solicitaste esto, puedes ignorar este correo.'
}) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(titulo)}</title>
</head>
<body style="margin:0; padding:0; background-color:#e5e5e5; font-family:Arial, Helvetica, sans-serif;">
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
            <td align="center" style="padding:36px 40px 12px 40px;">
              <p style="margin:0; font-size:22px; font-weight:800; color:${COLOR}; letter-spacing:0.5px;">${escapeHtml(titulo)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 50px 8px 50px;">
              <p style="margin:0 0 12px 0; font-size:15px; color:#222222;">Hola ${escapeHtml(saludo)},</p>
              <p style="margin:0; font-size:14px; color:#666666; line-height:22px;">${escapeHtml(mensaje)}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 50px 8px 50px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:${COLOR}; border-radius:30px;">
                    <a href="${escapeHtml(botonUrl)}" target="_blank" style="display:block; padding:14px 32px; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none;">
                      ${escapeHtml(botonTexto)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 50px 24px 50px;">
              <p style="margin:0; font-size:12px; color:#999999; word-break:break-all;">${escapeHtml(botonUrl)}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:${COLOR}; height:6px; font-size:0; line-height:6px;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="background-color:#000000; padding:20px 40px;">
              <p style="margin:0; font-size:12px; color:#cccccc;">${escapeHtml(aviso)}</p>
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
    attachments: [{
      filename: 'logo-sanva-shows.png',
      path: path.join(ASSETS, 'logo-sanva-shows.png'),
      cid: 'logo@sanva'
    }]
  };
};

module.exports = { construirEmailAcceso };
