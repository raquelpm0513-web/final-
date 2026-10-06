import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildOfficialPolicyPdf() {
  console.log('Generating the exact 12-page official Política de Seguridad - ENS document...');
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Logo
  const logoBytes = fs.readFileSync(path.join(rootDir, 'assets', 'fimecorp-doc-logo.png'));
  const logoImg = await pdfDoc.embedPng(logoBytes);

  // Pyramid
  const pyramidBytes = fs.readFileSync(path.join(rootDir, 'assets', 'doc-pyramid.png'));
  const pyramidImg = await pdfDoc.embedPng(pyramidBytes);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 58;
  const MARGIN_RIGHT = 58;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  const colorBlack = rgb(0.08, 0.08, 0.08);
  const colorGray = rgb(0.2, 0.2, 0.2);
  const colorBurgundy = rgb(0.65, 0.15, 0.15);

  function addHeader(page) {
    page.drawImage(logoImg, { x: MARGIN_LEFT, y: 774, width: 125, height: 38 });
    page.drawText('POLÍTICA DE SEGURIDAD - ENS', {
      x: 225,
      y: 792,
      font: fontBold,
      size: 10.5,
      color: colorBlack
    });
    page.drawText('Edición: 1.0', {
      x: 480,
      y: 802,
      font: fontOblique,
      size: 8.5,
      color: colorBlack
    });
    page.drawText('Fecha: 30/07/2026', {
      x: 452,
      y: 788,
      font: fontOblique,
      size: 8.5,
      color: colorBlack
    });
    page.drawLine({
      start: { x: MARGIN_LEFT, y: 768 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 768 },
      thickness: 0.8,
      color: colorBlack
    });
  }

  function wrapText(text, maxWidth, font, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const w of words) {
      const testLine = currentLine ? currentLine + ' ' + w : w;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function drawHeading(page, y, text) {
    page.drawText(text, {
      x: MARGIN_LEFT,
      y,
      font: fontBold,
      size: 10.5,
      color: colorBlack
    });
    return y - 16;
  }

  function drawParagraph(page, y, text, opts = {}) {
    const fontSize = opts.fontSize || 9.5;
    const lineHeight = opts.lineHeight || 13.5;
    const font = opts.font || fontRegular;
    const color = opts.color || colorGray;
    const underline = opts.underline || false;
    const indent = opts.indent || 0;
    const maxWidth = (opts.maxWidth || CONTENT_WIDTH) - indent;

    const lines = wrapText(text, maxWidth, font, fontSize);
    for (const line of lines) {
      const x = MARGIN_LEFT + indent;
      page.drawText(line, {
        x,
        y,
        font,
        size: fontSize,
        color
      });
      if (underline) {
        const lineWidth = font.widthOfTextAtSize(line, fontSize);
        page.drawLine({
          start: { x, y: y - 1.5 },
          end: { x: x + lineWidth, y: y - 1.5 },
          thickness: 0.6,
          color
        });
      }
      y -= lineHeight;
    }
    return y - (opts.extraSpacing || 7);
  }

  function drawArrowBullet(page, y, text) {
    const x = MARGIN_LEFT + 15;
    // Draw arrow
    page.drawLine({ start: { x, y: y + 3 }, end: { x: x + 8, y: y + 3 }, thickness: 1.4, color: colorBlack });
    page.drawLine({ start: { x: x + 5, y: y + 6 }, end: { x: x + 8, y: y + 3 }, thickness: 1.4, color: colorBlack });
    page.drawLine({ start: { x: x + 5, y: y }, end: { x: x + 8, y: y + 3 }, thickness: 1.4, color: colorBlack });

    return drawParagraph(page, y, text, { indent: 32, extraSpacing: 5 });
  }

  function drawSquareBullet(page, y, text) {
    const x = MARGIN_LEFT + 15;
    page.drawRectangle({ x, y: y + 2, width: 4.5, height: 4.5, color: colorBlack });
    return drawParagraph(page, y, text, { indent: 30, extraSpacing: 4 });
  }

  function drawDashBullet(page, y, text) {
    const x = MARGIN_LEFT + 15;
    page.drawLine({ start: { x, y: y + 3 }, end: { x: x + 6, y: y + 3 }, thickness: 1.2, color: colorBlack });
    return drawParagraph(page, y, text, { indent: 28, extraSpacing: 4 });
  }

  // ==========================================
  // PAGE 1
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 735;

    y = drawHeading(page, y, '1.  Aprobación y entrada en vigor');
    y = drawParagraph(page, y, 'Esta Política de Seguridad de la Información es efectiva desde la fecha de firma y hasta que sea reemplazada por una nueva Política.', { extraSpacing: 10 });

    y = drawHeading(page, y, '2.  Misión de la organización');
    y = drawParagraph(page, y, 'Fimecorp International S.L. tiene como actividad la distribución y comercialización de equipos, dispositivos y software medicos, asi como el soporte a dichas actividades. Para alcanzar sus objetivos asume su compromiso con la seguridad de la información, comprometiéndose a la adecuada gestión de esta, con el fin de ofrecer a todos sus grupos de interés las mayores garantías en torno a la seguridad de la información utilizada.');

    y = drawParagraph(page, y, 'Estos sistemas deben ser administrados con diligencia, tomando las medidas adecuadas para protegerlos frente a daños accidentales o deliberados que puedan afectar a la disponibilidad, integridad o confidencialidad de la información tratada o los servicios prestados.');

    y = drawParagraph(page, y, 'El objetivo de la seguridad de la información es garantizar la calidad de la información y la prestación continuada de los servicios, actuando preventivamente, supervisando la actividad diaria y reaccionando con presteza a los incidentes.');

    y = drawParagraph(page, y, 'Los sistemas TIC deben estar protegidos contra amenazas de rápida evolución con potencial para incidir en la confidencialidad, integridad, disponibilidad, uso previsto y valor de la información y los servicios. Para defenderse de estas amenazas, se requiere una estrategia que se adapte a los cambios en las condiciones del entorno para garantizar la prestación continua de los servicios. Esto implica que los departamentos deben aplicar las medidas mínimas de seguridad exigidas por el Esquema Nacional de Seguridad, así como realizar un seguimiento continuo de los niveles de prestación de servicios, seguir y analizar las vulnerabilidades reportadas, y preparar una respuesta efectiva a los incidentes para garantizar la continuidad de los servicios prestados.');

    y = drawParagraph(page, y, 'Los diferentes departamentos deben cerciorarse de que la seguridad TIC es una parte integral de cada etapa del ciclo de vida del sistema, desde su concepción hasta su retirada de servicio, pasando por las decisiones de desarrollo o adquisición y las actividades de explotación. Los requisitos de seguridad y las necesidades de financiación deben ser identificados, tanto para los productos que desarrolla y sus servicios asociados, cómo en lo que se refiere al software base adquirido de terceros.');

    y = drawParagraph(page, y, 'Los departamentos deben estar preparados para prevenir, detectar, reaccionar y recuperarse de incidentes, de acuerdo con el Artículo 8 del ENS (Artículo 8. Prevención, detección, respuesta y conservación).', { extraSpacing: 10 });

    y = drawHeading(page, y, '3.  Alcance');
    y = drawParagraph(page, y, 'Esta política se aplica a todos los sistemas de información que dan soporte a las actividades de:');
  }

  // ==========================================
  // PAGE 2
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawDashBullet(page, y, 'Distribución de equipos, dispositivos y software médicos.');
    y = drawDashBullet(page, y, 'Comercialización de equipos, dispositivos y software médicos.');
    y = drawDashBullet(page, y, 'Soporte a las actividades de distribución y comercialización de equipos, dispositivos y software médicos.');

    y = drawParagraph(page, y, 'y a todos los miembros de la organización, implicados en Servicios y Proyectos destinados al sector público, que requieran la aplicación del Esquema Nacional de Seguridad (ENS), sin excepciones.', { extraSpacing: 14 });

    y = drawHeading(page, y, '4.  Objetivos');
    y = drawParagraph(page, y, 'Por todo lo anteriormente expuesto, la Dirección establece los siguientes objetivos de seguridad de la información:');

    y = drawArrowBullet(page, y, 'Proporcionar un marco para aumentar la capacidad de resistencia o resiliencia para dar una respuesta eficaz.');
    y = drawArrowBullet(page, y, 'Asegurar la recuperación rápida y eficiente de los servicios, frente a cualquier desastre físico o contingencia que pudiera ocurrir y que pusiera en riesgo la continuidad de las operaciones.');
    y = drawArrowBullet(page, y, 'Prevenir incidentes de seguridad de la información en la medida que sea técnica y económicamente viable, así como mitigar los riesgos de seguridad de la información generados por nuestras actividades.');
    y = drawArrowBullet(page, y, 'Garantizar la confidencialidad, integridad, disponibilidad, autenticidad y trazabilidad de la información.', { extraSpacing: 14 });

    y = drawHeading(page, y, '5.  Marco normativo');
    y = drawParagraph(page, y, 'Uno de los objetivos debe ser el de cumplir con requisitos legales aplicables y con cualesquiera otros requisitos que suscribimos además de los compromisos adquiridos con los clientes, así como la actualización continua de los mismos. Para ello, el marco legal y regulatorio en el que desarrollamos nuestras actividades es:');

    y = drawArrowBullet(page, y, 'REGLAMENTO (UE) 2016/679 DEL PARLAMENTO EUROPEO Y DEL CONSEJO de 27 de abril de 2016 relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales y a la libre circulación de estos datos.');
    y = drawArrowBullet(page, y, 'Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales.');
    y = drawArrowBullet(page, y, 'Real Decreto Legislativo 1/1996, de 12 de abril, Ley de Propiedad Intelectual.');
  }

  // ==========================================
  // PAGE 3
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawArrowBullet(page, y, 'Ley 2/2019, de 1 de marzo, por la que se modifica el texto refundido de la Ley de Propiedad Intelectual, aprobado por el Real Decreto Legislativo 1/1996, de 12 de abril, y por el que se incorporan al ordenamiento jurídico español la Directiva 2014/26/UE del Parlamento Europeo y del Consejo, de 26 de febrero de 2014, y la Directiva (UE) 2017/1564 del Parlamento Europeo y del Consejo, de 13 de septiembre de 2017.');

    y = drawArrowBullet(page, y, 'Real Decreto 311/2022, de 3 de Mayo, por el que se regula el Esquema Nacional de Seguridad.');

    y = drawArrowBullet(page, y, 'Ley 34/2002 de 11 de julio de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI).');

    y = drawArrowBullet(page, y, 'Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público.');

    y = drawArrowBullet(page, y, 'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas.');

    y = drawArrowBullet(page, y, 'Resolución de 7 de octubre de 2016, de la Secretaría de Estado de Administraciones Públicas, por la que se aprueba la Instrucción Técnica de Seguridad de Informe del Estado de la Seguridad. o Resolución de 13 de octubre de 2016, de la Secretaría de Estado de Administraciones Públicas, por la que se aprueba la Instrucción Técnica de Seguridad de conformidad con el Esquema Nacional de Seguridad.');

    y = drawArrowBullet(page, y, 'Resolución de 27 de marzo de 2018, de la Secretaría de Estado de Función Pública, por la que se aprueba la Instrucción Técnica de Seguridad de Auditoría de la Seguridad de los Sistemas de Información. o Resolución de 13 de abril de 2018, de la Secretaría de Estado de Función Pública, por la que se aprueba la Instrucción Técnica de Seguridad de Notificación de Incidentes de Seguridad.');

    y = drawArrowBullet(page, y, 'REGLAMENTO (UE) No 910/2014 DEL PARLAMENTO EUROPEO Y DEL CONSEJO de 23 de julio de 2014 relativo a la identificación electrónica y los servicios de confianza para las transacciones electrónicas en el mercado interior y por la que se deroga la Directiva 1999/93/CE', { extraSpacing: 16 });

    y = drawHeading(page, y, '6.  Desarrollo');
    y = drawParagraph(page, y, 'Para poder lograr estos objetivos es necesario:');

    y = drawArrowBullet(page, y, 'Mejorar continuamente nuestro sistema de seguridad de la información.');
    y = drawArrowBullet(page, y, 'Identificar las amenazas potenciales, así como el impacto en las operaciones de negocio que dichas amenazas, caso de materializarse, puedan causar.');
  }

  // ==========================================
  // PAGE 4
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawArrowBullet(page, y, 'Preservar los intereses de sus principales partes interesadas (clientes, accionistas, empleados y proveedores), la reputación, la marca y las actividades de creación de valor.');

    y = drawArrowBullet(page, y, 'Trabajar de forma conjunta con nuestros suministradores y subcontratistas con el fin de mejorar la prestación de servicios de TI, la continuidad de los servicios y la seguridad de la información, que repercutan en una mayor eficiencia de nuestra actividad.');

    y = drawArrowBullet(page, y, 'Evaluar y garantizar la competencia técnica del personal, así como asegurar la motivación adecuada de éste para su participación en la mejora continua de nuestros procesos, proporcionando la formación y la comunicación interna adecuada para que desarrollen buenas prácticas definidas en el sistema.');

    y = drawArrowBullet(page, y, 'Garantizar el correcto estado de las instalaciones y el equipamiento adecuado, de forma tal que estén en correspondencia con la actividad, objetivos y metas de la empresa.');

    y = drawArrowBullet(page, y, 'Garantizar un análisis de manera continua de todos los procesos relevantes, estableciéndose las mejoras pertinentes en cada caso, en función de los resultados obtenidos y de los objetivos establecidos.');

    y = drawArrowBullet(page, y, 'Estructurar nuestro sistema de gestión de forma que sea fácil de comprender. Nuestro sistema de gestión tiene la siguiente estructura:');

    // Pyramid graphic
    y -= 10;
    const pyrWidth = 360;
    const pyrHeight = 140;
    const pyrX = MARGIN_LEFT + (CONTENT_WIDTH - pyrWidth) / 2;
    page.drawImage(pyramidImg, { x: pyrX, y: y - pyrHeight, width: pyrWidth, height: pyrHeight });
    y -= (pyrHeight + 22);

    y = drawParagraph(page, y, 'La gestión de nuestro sistema se encomienda al Responsable de Sistemas Informáticos y el sistema estará disponible en nuestro sistema de información en un repositorio, al cual se puede acceder según los perfiles de acceso concedidos según nuestro procedimiento en vigor de gestión de los accesos.', { extraSpacing: 14 });

    y = drawHeading(page, y, '7.  Organización de seguridad');
    y = drawParagraph(page, y, 'La responsabilidad esencial recae sobre la Dirección General de la organización, ya que esta es responsable de organizar las funciones y responsabilidades y de facilitar los recursos adecuados para');
  }

  // ==========================================
  // PAGE 5
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawParagraph(page, y, 'conseguir los objetivos del ENS. Los directivos son también responsables de dar buen ejemplo siguiendo las normas de seguridad establecidas.');

    y = drawParagraph(page, y, 'Estos principios son asumidos por la Dirección, quien dispone los medios necesarios y dota a sus empleados de los recursos suficientes para su cumplimiento, plasmándose y poniéndolos en público conocimiento a través de la presentes Políticas de Seguridad');

    y = drawParagraph(page, y, 'Los roles o funciones de seguridad definidos son:', { extraSpacing: 8 });

    // Table
    const tableTop = y;
    const col1Width = 140;
    const col2Width = CONTENT_WIDTH - col1Width;
    const tableX = MARGIN_LEFT;

    // Header row
    page.drawRectangle({
      x: tableX,
      y: tableTop - 24,
      width: CONTENT_WIDTH,
      height: 24,
      color: colorBurgundy
    });
    page.drawText('Función', {
      x: tableX + 10,
      y: tableTop - 16,
      font: fontBold,
      size: 9.5,
      color: rgb(1, 1, 1)
    });
    page.drawText('Deberes y responsabilidades', {
      x: tableX + col1Width + 10,
      y: tableTop - 16,
      font: fontBold,
      size: 9.5,
      color: rgb(1, 1, 1)
    });

    const rows = [
      {
        func: 'Responsable de la\ninformación (RINFO)',
        duties: ['· Tomar las decisiones relativas a la información tratada']
      },
      {
        func: 'Responsable de los\nservicios (RSER)',
        duties: ['· Coordinar la implantación del sistema', '· Mejorar el sistema de forma continua']
      },
      {
        func: 'Responsable de la\nseguridad (RSEG)',
        duties: ['· Determinar la idoneidad de las medidas técnicas', '· Proporcionar la mejor tecnología para el servicio']
      },
      {
        func: 'Responsable del\nsistema (RSIS)',
        duties: ['· Coordinar la implantación del sistema', '· Mejorar el sistema de forma continua']
      },
      {
        func: 'Dirección',
        duties: ['· Proporcionar los recursos necesarios para el sistema', '· Liderar el sistema']
      }
    ];

    let currentY = tableTop - 24;
    for (const row of rows) {
      const rowHeight = row.duties.length > 1 ? 40 : 30;
      const cellY = currentY - rowHeight;

      // Outer border & divider
      page.drawRectangle({
        x: tableX,
        y: cellY,
        width: CONTENT_WIDTH,
        height: rowHeight,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.8
      });
      page.drawLine({
        start: { x: tableX + col1Width, y: cellY },
        end: { x: tableX + col1Width, y: currentY },
        color: rgb(0.8, 0.8, 0.8),
        thickness: 0.8
      });

      // Left column text
      const funcLines = row.func.split('\n');
      let fy = cellY + (rowHeight - (funcLines.length * 12)) / 2 + (funcLines.length - 1) * 11;
      for (const fl of funcLines) {
        page.drawText(fl, {
          x: tableX + 10,
          y: fy,
          font: fontBold,
          size: 8.5,
          color: colorBurgundy
        });
        fy -= 12;
      }

      // Right column text
      let dy = cellY + (rowHeight - (row.duties.length * 13)) / 2 + (row.duties.length - 1) * 12;
      for (const d of row.duties) {
        page.drawText(d, {
          x: tableX + col1Width + 10,
          y: dy,
          font: fontRegular,
          size: 8.5,
          color: colorBlack
        });
        dy -= 13;
      }

      currentY = cellY;
    }

    y = currentY - 18;

    y = drawParagraph(page, y, 'Esta definición de deberes y responsabilidades se completa en los perfiles de puesto y en los documentos del sistema Registro de responsables, roles y responsabilidades.', { extraSpacing: 14 });

    y = drawHeading(page, y, '8.  Comité de Seguridad');
    y = drawParagraph(page, y, 'El procedimiento para su designación y renovación será la ratificación en el comité de seguridad.');

    y = drawParagraph(page, y, 'El comité para la gestión y coordinación de la seguridad es el órgano con mayor responsabilidad dentro del sistema de gestión de seguridad de la información, de forma que todas las decisiones más importantes relacionadas con la seguridad se acuerdan por este comité.');

    y = drawParagraph(page, y, 'Los miembros del comité de seguridad de la información son:');

    y = drawSquareBullet(page, y, 'Responsable de la Información');
    y = drawSquareBullet(page, y, 'Responsable de los Servicios');
  }

  // ==========================================
  // PAGE 6
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawSquareBullet(page, y, 'Responsable de la Seguridad');
    y = drawSquareBullet(page, y, 'Responsable del Sistema');
    y = drawSquareBullet(page, y, 'Dirección Empresa (Socios-Administradores)', { extraSpacing: 10 });

    y = drawParagraph(page, y, 'Estos miembros son designados por el comité, único órgano que puede nombrarlos, renovarlos y cesarlos.');

    y = drawParagraph(page, y, 'El comité de seguridad es un órgano autónomo, ejecutivo y con autonomía para la toma de decisiones y que no tiene que subordinar su actividad a ningún otro elemento de nuestra empresa.');

    y = drawParagraph(page, y, 'La organización de la Seguridad de la información se desarrolla en el documento complementario, entre sus funciones se deja resaltada las de velar por el ENS y entre sus tareas principales destaca la resolución de conflictos, ya que las diferencias de criterios que pudiesen derivar en un conflicto se tratarán en el seno del Comité de seguridad y prevalecerá en todo caso el criterio de la Dirección General.');

    y = drawParagraph(page, y, 'La organización de la Seguridad de la información se desarrolla en el documento complementario a esta Política de Organización de la Seguridad.');

    y = drawParagraph(page, y, 'Está política se complementa con el resto de las políticas, procedimientos y documentos en vigor para desarrollar nuestro sistema de gestión.', { extraSpacing: 14 });

    y = drawHeading(page, y, '9.  Gestión de Riesgos');
    y = drawParagraph(page, y, 'Todos los sistemas sujetos a esta Política deberán realizar un análisis de riesgos, evaluando las amenazas y los riesgos a los que están expuestos. Este análisis se revisa regularmente:');

    y = drawSquareBullet(page, y, 'al menos una vez al año;');
    y = drawSquareBullet(page, y, 'cuando cambie la información manejada;');
    y = drawSquareBullet(page, y, 'cuando cambien los servicios prestados;');
    y = drawSquareBullet(page, y, 'cuando ocurra un incidente grave de seguridad;');
    y = drawSquareBullet(page, y, 'cuando se reporten vulnerabilidades graves.', { extraSpacing: 8 });

    y = drawParagraph(page, y, 'Para la armonización de los análisis de riesgos, el Comité de Seguridad TIC establecerá una valoración de referencia para los diferentes tipos de información manejados y los diferentes servicios prestados. El Comité de Seguridad TIC dinamizará la disponibilidad de recursos para atender a las necesidades de seguridad de los diferentes sistemas, promoviendo inversiones de carácter horizontal.');

    y = drawParagraph(page, y, 'Para la realización del análisis de riesgos se tendrá en cuenta la metodología de análisis de riesgos desarrollada en el procedimiento Análisis de Riesgos.', { extraSpacing: 14 });

    y = drawHeading(page, y, '10.  Gestión de Personal');
    y = drawParagraph(page, y, 'Todos los miembros de Fimecorp International S.L. tienen la obligación de conocer y cumplir esta Política de Seguridad de la Información y la Normativa de Seguridad, siendo responsabilidad del Comité de Seguridad TIC disponer los medios necesarios para que la información llegue a los afectados.');
  }

  // ==========================================
  // PAGE 7
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawParagraph(page, y, 'Todos los miembros de Fimecorp International S.L. atenderán a una sesión de concienciación en materia de seguridad TIC al menos una vez al año. Se establecerá un programa de concienciación continua para atender a todos los miembros de Fimecorp International S.L., en particular a los de nueva incorporación.');

    y = drawParagraph(page, y, 'Las personas con responsabilidad en el uso, operación o administración de sistemas TIC recibirán formación para el manejo seguro de los sistemas en la medida en que la necesiten para realizar su trabajo. La formación será obligatoria antes de asumir una responsabilidad, tanto si es su primera asignación o si se trata de un cambio de puesto de trabajo o de responsabilidades en el mismo.', { extraSpacing: 14 });

    y = drawHeading(page, y, '11.  Profesionalidad y seguridad de los recursos humanos');
    y = drawParagraph(page, y, 'Esta Política se aplica a todo el personal de Fimecorp International S.L. y el personal externo que realiza tareas dentro de la empresa.');

    y = drawParagraph(page, y, 'RRHH incluirá funciones de seguridad de la información en las descripciones de los trabajos de los empleados, informará a todo el personal que contrate sus obligaciones con respecto al cumplimiento de la Política de Seguridad de la Información, gestionará los Compromisos de Confidencialidad con el personal y coordinará las tareas de capacitación de los usuarios con respecto a esta Política.');

    y = drawSquareBullet(page, y, 'El Responsable de Gestión de la Seguridad (RGS), es responsable de monitorear, documentar y analizar los incidentes de seguridad reportados, así como de comunicarse al Comité de Seguridad de la Información y a los propietarios de información.');

    y = drawSquareBullet(page, y, 'El Comité de Seguridad de la Información será responsable de implementar los medios y canales necesarios para que el Responsable de Gestión de la Seguridad (RGS) maneje informes de incidentes y anomalías del sistema. El Comité también estará al tanto, supervisará la investigación, supervisará la evolución de la información y promoverá la resolución de incidentes de seguridad de la información.');

    y = drawSquareBullet(page, y, 'El Responsable de Gestión de la Seguridad (RGS) participará en la preparación del Compromiso de Confidencialidad que firmará los empleados y terceros que desempeñen funciones en Fimecorp International S.L., en el asesoramiento sobre las sanciones que se aplicarán por incumplimiento de esta Política y en el tratamiento de incidentes de seguridad de la información.');

    y = drawSquareBullet(page, y, 'Todo el personal de Fimecorp International S.L. es responsable de informar sobre las debilidades e incidentes de seguridad de la información que se detectan oportunamente.', { extraSpacing: 8 });

    y = drawSquareBullet(page, y, 'Profesionalidad de los recursos humanos:');
    y = drawSquareBullet(page, y, 'Determinar la competencia necesaria del personal para llevar a cabo el trabajo que afecta a la Seguridad de la Información.');
    y = drawSquareBullet(page, y, 'Hay que asegurar que las personas sean competentes sobre la base de la educación, capacitación o experiencia adecuadas.');
  }

  // ==========================================
  // PAGE 8
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawSquareBullet(page, y, 'Demostrar mediante la información documentada que sea necesaria la competencia del personal en materia de Seguridad de la Información.', { extraSpacing: 10 });

    y = drawParagraph(page, y, 'Los objetivos de controlar la seguridad del personal son:');

    y = drawSquareBullet(page, y, 'Reducir los riesgos de error humano, puesta en marcha de irregularidades, uso indebido de instalaciones y recursos, y manejo no autorizado de la información.');

    y = drawSquareBullet(page, y, 'Explicar las responsabilidades de seguridad en la etapa de reclutamiento del personal e incluirlas en los acuerdos a firmar y verificar su cumplimiento durante el desempeño de las tareas del empleado.');

    y = drawSquareBullet(page, y, 'Asegúrese de que los usuarios estén al tanto de las amenazas y preocupaciones de seguridad de la información y estén capacitados para apoyar la Política de Seguridad de la Información de la organización en el curso de sus tareas normales.');

    y = drawSquareBullet(page, y, 'Establecer compromisos de confidencialidad con todo el personal y usuarios fuera de las instalaciones de procesamiento de información.');

    y = drawSquareBullet(page, y, 'Establecer las herramientas y mecanismos necesarios para promover la comunicación de las debilidades de seguridad existentes, así como los incidentes, con el fin de minimizar sus efectos y prevenir su reincidencia.', { extraSpacing: 14 });

    y = drawHeading(page, y, '12.  Autorización y control de acceso a los Sistemas de Información');
    y = drawParagraph(page, y, 'El control del acceso a los sistemas de información tiene por objetivo:');

    y = drawSquareBullet(page, y, 'Evitar el acceso no autorizado a sistemas de información, bases de datos y servicios de información.');
    y = drawSquareBullet(page, y, 'Implementar la seguridad en el acceso de los usuarios a través de técnicas de autenticación y autorización.');
    y = drawSquareBullet(page, y, 'Controlar la seguridad en la conexión entre la red de Fimecorp International S.L. y otras redes públicas o privadas.');
    y = drawSquareBullet(page, y, 'Revisar los eventos críticos y las actividades llevadas a cabo por los usuarios en los sistemas.');
    y = drawSquareBullet(page, y, 'Concienciar sobre su responsabilidad por el uso de contraseñas y equipos.');
    y = drawSquareBullet(page, y, 'Garantizar la seguridad de la información cuando se utilizan ordenadores portátiles y ordenadores personales para el trabajo remoto.');
  }

  // ==========================================
  // PAGE 9
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawHeading(page, y, '13.  Protección de las instalaciones');
    y = drawParagraph(page, y, 'Los objetivos de esta política en materia de protección de las instalaciones son:');
    y = drawParagraph(page, y, 'Prevenir el acceso no autorizado, daños e interferencias a la sede, instalaciones e información de Fimecorp International S.L.');

    y = drawSquareBullet(page, y, 'Proteger el equipo de procesamiento de información crítico de Fimecorp International S.L., colocándolo en áreas protegidas y protegido por un perímetro de seguridad definido, con las medidas de seguridad y controles de acceso adecuados. Asimismo, contemplar la protección de esta en su traslado y permanecer fuera de las áreas protegidas, por mantenimiento u otros motivos.');

    y = drawSquareBullet(page, y, 'Controlar los factores ambientales que podrían perjudicar el buen funcionamiento del equipo de cómputo que alberga la información de Fimecorp International S.L.');

    y = drawSquareBullet(page, y, 'Implementar medidas para proteger la información manejada por el personal en las oficinas, en el marco normal de sus tareas habituales.');

    y = drawSquareBullet(page, y, 'Proporcionar protección proporcional a los riesgos identificados.', { extraSpacing: 10 });

    y = drawParagraph(page, y, 'Esta Política se aplica a todos los recursos físicos relacionados con los sistemas de información de Fimecorp International S.L.: instalaciones, equipos, cableado, expedientes, medios de almacenamiento, etc.', { extraSpacing: 10 });

    y = drawParagraph(page, y, 'La información y los sistemas de información de Fimecorp International S.L. se almacenan y gestionan a través de Google Drive (Google Workspace), un servicio de almacenamiento y colaboración en la nube prestado por un tercero, sin que Fimecorp International S.L. disponga de bases de datos ni infraestructuras de servidores propias. En consecuencia, no existen entornos de desarrollo, calidad o producción locales que proteger; los activos físicos a proteger localmente se limitan a portátiles, dispositivos móviles y periféricos del personal.', { underline: true, extraSpacing: 10 });

    y = drawParagraph(page, y, 'La seguridad de la información alojada en Google Drive se apoya en las medidas de seguridad, certificaciones y garantías contractuales ofrecidas por el proveedor cloud, junto con las medidas propias de Fimecorp International S.L. en materia de gestión de identidades y accesos ,autenticación ,cifrado y configuración segura del servicio. Estos aspectos se desarrollan en el procedimiento correspondiente a la protección de servicios en la nube (op.nub), conforme a lo exigido por el Esquema Nacional de Seguridad para servicios prestados por terceros.', { underline: true, extraSpacing: 10 });

    y = drawParagraph(page, y, 'El responsable de Gestión de la Seguridad (RGS), junto con los Titulares de la Información, según proceda, definirá las medidas de seguridad física y ambiental para la protección de los activos críticos, sobre la base de un análisis de riesgos, y supervisará su aplicación. También verificará el cumplimiento de las disposiciones de seguridad física y medioambiental.');
  }

  // ==========================================
  // PAGE 10
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawParagraph(page, y, 'Los responsables de los diferentes departamentos definirán los niveles de acceso físico del personal de Fimecorp International S.L. a las áreas restringidas bajo su responsabilidad. Los Propietarios de Información autorizarán formalmente el trabajo fuera del sitio con información sobre su negocio a los empleados de Fimecorp International S.L. cuando lo consideren apropiado.');

    y = drawParagraph(page, y, 'Todo el personal de Fimecorp International S.L. es responsable del cumplimiento de la política de pantalla limpia y escritorio, para la protección de la información relacionada con el trabajo diario en las oficinas.', { extraSpacing: 14 });

    y = drawHeading(page, y, '14.  Adquisición de productos');
    y = drawParagraph(page, y, 'Los diferentes departamentos deben cerciorarse de que la seguridad TIC es una parte integral de cada etapa del ciclo de vida del sistema, desde su concepción hasta su retirada de servicio, pasando por las decisiones de desarrollo o adquisición y las actividades de explotación. Los requisitos de seguridad y las necesidades de financiación deben ser identificados e incluidos en la planificación, en la solicitud de ofertas, y en pliegos de licitación para proyectos de TIC.');

    y = drawParagraph(page, y, 'Por otro lado, se tendrá en cuenta la seguridad de la información en la adquisición y mantenimiento de los sistemas de información, limitando y gestionando el cambio.', { extraSpacing: 14 });

    y = drawHeading(page, y, '15.  Seguridad por defecto');
    y = drawParagraph(page, y, 'Fimecorp International S.L. considera estratégico para la entidad que los procesos integren la seguridad de la información como parte de su ciclo de vida. Los sistemas de información y los servicios deben incluir la seguridad por defecto desde su creación hasta su retirada, incluyéndose la seguridad en las decisiones de desarrollo y/o adquisición y en todas las actividades en explotación estableciéndose la seguridad como un proceso integral y transversal.', { extraSpacing: 14 });

    y = drawHeading(page, y, '16.  Integridad y actualización del sistema');
    y = drawParagraph(page, y, 'Fimecorp International S.L. se compromete a garantizar la integridad del sistema mediante un proceso de gestión de cambios que permita el control de la actualización de los elementos físicos o lógicos mediante la autorización previa a su instalación en el sistema. Dicha evaluación será llevada a cabo principalmente por el Responsable del Sistema, que evaluará el impacto en la seguridad del sistema antes de realizar los cambios y controlará de forma documentada aquellos cambios que se evalúen como importantes o con implicaciones en la seguridad de los sistemas.');

    y = drawParagraph(page, y, 'Mediante revisiones periódicas de seguridad se evaluará el estado de seguridad de los sistemas, en relación con las especificaciones de los fabricantes, a las vulnerabilidades y a las actualizaciones que les afecten, reaccionando con diligencia para gestionar el riesgo a la vista del estado de seguridad de estos.');
  }

  // ==========================================
  // PAGE 11
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawHeading(page, y, '17.  Protección de la información almacenada y en tránsito');
    y = drawParagraph(page, y, 'Fimecorp International S.L. establece medidas de protección para la Seguridad de la Información almacenada o en tránsito a través de entornos inseguros. Tendrán la consideración de entornos inseguros los equipos portátiles, dispositivos periféricos, soportes de información y comunicaciones sobre redes abiertas o con cifrado débil.', { extraSpacing: 14 });

    y = drawHeading(page, y, '18.  Prevención de sistemas de información interconectados');
    y = drawParagraph(page, y, 'Fimecorp International S.L., establece medidas de protección para la Seguridad de la Información especialmente para proteger el perímetro, en particular, si se conecta a redes públicas, especialmente si se utilizan en su totalidad o principalmente, para la prestación de servicios de comunicaciones electrónicas disponibles para el público.');

    y = drawParagraph(page, y, 'En todo caso se analizarán los riesgos derivados de la interconexión del sistema, a través de redes, con otros sistemas, y se controlará su punto de unión. Conexiones electrónicas disponibles para el público.', { extraSpacing: 14 });

    y = drawHeading(page, y, '19.  Registros de actividad');
    y = drawParagraph(page, y, 'Fimecorp International S.L., registrará las actividades de los usuarios, reteniendo la información necesaria para monitorizar, analizar, investigar y documentar actividades indebidas o no autorizadas, permitiendo identificar en cada momento a la persona que actúa.');

    y = drawParagraph(page, y, 'Los objetivos principales de la Gestión de incidentes son los de:');

    y = drawSquareBullet(page, y, 'Establecer un sistema de detección y reacción frente a código dañino.');
    y = drawSquareBullet(page, y, 'Disponer de procedimientos de gestión de incidentes de seguridad y de debilidades detectadas en los elementos del sistema de información.');
    y = drawSquareBullet(page, y, 'Estos procedimientos cubrirán los mecanismos de detección, los criterios de clasificación, los procedimientos de análisis y resolución, así como los cauces de comunicación a las partes interesadas y el registro de las actuaciones.');
    y = drawSquareBullet(page, y, 'Este registro se emplea para la mejora continua de la seguridad del sistema.');
    y = drawSquareBullet(page, y, 'Garantizar que los servicios de IT vuelvan a tener un desempeño óptimo.');
    y = drawSquareBullet(page, y, 'Reducir los posibles riesgos e impactos que pueda causar el incidente.');
    y = drawSquareBullet(page, y, 'Velar por la integridad de los sistemas en el caso de un incidente de seguridad.');
    y = drawSquareBullet(page, y, 'Comunicar el impacto de un incidente tan pronto como se detecte para activar la alarma; y poner en práctica un plan de comunicación empresarial adecuado.');
    y = drawSquareBullet(page, y, 'Promover la eficiencia empresarial.');
  }

  // ==========================================
  // PAGE 12
  // ==========================================
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addHeader(page);
    let y = 740;

    y = drawHeading(page, y, '20.  Continuidad de la actividad');
    y = drawParagraph(page, y, 'Fimecorp International S.L., con el objetivo de garantizar la continuidad de las actividades, establece medidas para que los sistemas dispongan de copias de seguridad y establece mecanismos necesarios para garantizar la continuidad de las operaciones, en caso de pérdida de los medios habituales de trabajo.', { extraSpacing: 14 });

    y = drawHeading(page, y, '21.  Mejora continua del proceso de seguridad');
    y = drawParagraph(page, y, 'Fimecorp International S.L. establece un proceso de mejora continua de la seguridad de la información aplicando los criterios y metodología establecida en el Esquema Nacional de Seguridad.', { extraSpacing: 80 });

    y = drawParagraph(page, y, 'En Talavera de la Reina, a 30 de Julio de 2026', { extraSpacing: 60 });

    y = drawParagraph(page, y, 'Dirección General');
  }

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  console.log(`PDF created successfully (${pdfBytes.length} bytes, 12 pages)`);

  const targetPdfPaths = [
    path.join(rootDir, 'politica-de-seguridad-ens.pdf'),
    path.join(rootDir, 'dist', 'politica-de-seguridad-ens.pdf'),
    path.join(rootDir, 'POLÍTICA DE SEGURIDAD.pdf'),
    path.join(rootDir, 'dist', 'POLÍTICA DE SEGURIDAD.pdf'),
    path.join(rootDir, 'Politica_de_Seguridad_ENS.pdf'),
    path.join(rootDir, 'dist', 'Politica_de_Seguridad_ENS.pdf'),
    path.join(rootDir, 'assets', 'politica-de-seguridad-ens.pdf'),
    path.join(rootDir, 'dist', 'assets', 'politica-de-seguridad-ens.pdf'),
  ];

  for (const p of targetPdfPaths) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, pdfBytes);
  }

  // Render pages to PNG using Ghostscript at 150 DPI (clean & crisp for web view)
  const assetsDir = path.join(rootDir, 'assets');
  const distAssetsDir = path.join(rootDir, 'dist', 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(distAssetsDir)) fs.mkdirSync(distAssetsDir, { recursive: true });

  const mainPdf = path.join(rootDir, 'politica-de-seguridad-ens.pdf');
  const outPattern = path.join(assetsDir, 'page-%d.png');

  console.log('Rendering 12 pages to PNG with Ghostscript...');
  execSync(`gs -dNOSAFER -dNOPAUSE -dBATCH -sDEVICE=png16m -r150 -sOutputFile="${outPattern}" "${mainPdf}"`, {
    stdio: 'inherit'
  });

  execSync(`cp -f "${assetsDir}"/page-*.png "${distAssetsDir}/" 2>/dev/null || true`);

  const pageFiles = fs.readdirSync(assetsDir).filter(f => /^page-\d+\.png$/.test(f))
    .sort((a,b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10));

  console.log(`Rendered ${pageFiles.length} pages in assets/ and dist/assets/!`);
  console.log('Page list:', pageFiles);
}

buildOfficialPolicyPdf().catch(err => {
  console.error('Error generating official policy PDF:', err);
  process.exit(1);
});
