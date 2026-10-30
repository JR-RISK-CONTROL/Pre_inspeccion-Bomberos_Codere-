/**
 * checklist.js
 * Estructura de datos del formato oficial RD-PR03-FT05
 * "LEVANTAMIENTO DE INFORMACIÓN DE INSPECCIÓN TÉCNICA (BAJO-MODERADO-ALTO)"
 * UAE Cuerpo Oficial de Bomberos Bogotá.
 *
 * Esta estructura reproduce fielmente la numeración, el texto y el
 * agrupamiento del formato original en Excel, para que el checklist
 * digital pueda exportarse de nuevo a Excel/PDF conservando la
 * identidad documental (código, versión, vigencia, página, secciones).
 */

const DOCUMENT_META = {
  codigo: "RD-PR03-FT05",
  version: "1",
  vigencia: "26/05/2026",
  nombreProcedimiento: "EMISIÓN DEL CONCEPTO TÉCNICO EN SEGURIDAD HUMANA Y SISTEMAS DE PROTECCIÓN CONTRA INCENDIO",
  nombreFormato: "LEVANTAMIENTO DE INFORMACIÓN DE INSPECCIÓN TÉCNICA (BAJO-MODERADO-ALTO)",
  entidad: "UAE Cuerpo Oficial de Bomberos Bogotá",
  contacto: {
    direccion: "Calle 20 No. 68 A-06",
    telefono: "PBX 382 25 00 - Línea 123",
    correo: "quejasysoluciones@bomberosbogota.gov.co"
  }
};

// Campo tipo "general": texto/fecha/numero. Campo tipo "chk": SI/NO/NA + observaciones.
// Campo tipo "chk2": SI/NO (sin NA) + observaciones (usado en sección de extintores).
// Campo tipo "chk-extra": chk + un campo adicional (cantidad, altura, tipo de tanque, etc).
// Campo tipo "numeric": solo un valor numérico (sin SI/NO).

const GENERAL_INFO_FIELDS = [
  { id: "conflicto_intereses", label: "0. CONFLICTO DE INTERESES — De acuerdo con la Ley 2013 de 2019, el inspector declara si tiene o no conflicto de intereses para la ejecución de esta visita.", type: "sino" },
  { id: "fecha_revision", label: "1. Fecha de revisión", type: "date" },
  { id: "radicado", label: "Radicado N°", type: "text" },
  { id: "anio_construccion", label: "2. Año de construcción", type: "text" },
  { id: "direccion", label: "3. Dirección", type: "text" },
  { id: "razon_social", label: "4. Razón social", type: "text" },
  { id: "nombre_establecimiento", label: "5. Nombre del establecimiento", type: "text" },
  { id: "nit_cedula", label: "6. NIT / Cédula", type: "text" },
  { id: "representante_legal", label: "7. Representante legal", type: "text" },
  { id: "descripcion_actividad", label: "8. Descripción de la actividad o proceso", type: "textarea" },
  { id: "telefonos", label: "9. Teléfonos", type: "text" },
  { id: "num_empleados", label: "10. N° de empleados", type: "number" },
  { id: "promedio_visitantes", label: "11. Promedio de visitantes (máx.)", type: "number" },
  { id: "total_personas", label: "12. Total", type: "number" },
  { id: "num_niveles_edificacion", label: "13. N° de niveles edificación", type: "number" },
  { id: "num_nivel_establecimiento", label: "14. N° de nivel del establecimiento / local", type: "number" },
  { id: "area_construida_edificacion", label: "15. Área construida edificación (m²)", type: "number" },
  { id: "area_construida_establecimiento", label: "16. Área construida establecimiento / local (m²)", type: "number" },
  { id: "num_salidas", label: "17. N° de salidas", type: "number" },
  { id: "ancho_min_pasillos", label: "18. Ancho mínimo pasillos y corredores (m)", type: "text" },
  { id: "ancho_min_puertas", label: "19. Ancho mínimo puertas (m)", type: "text" },
  { id: "grupo_uso", label: "20. Grupo de uso", type: "text" }
];

// Secciones B a E: checklist SI/NO/NA + observaciones, agrupadas por subtítulo normativo.
const CHECKLIST_SECTIONS = [
  {
    id: "B",
    titulo: "B. SEGURIDAD HUMANA",
    grupos: [
      {
        subtitulo: "PLAN DE EMERGENCIA (Decreto 1072 de 2015, Decreto 2157/2017, Art. 4 Acuerdo 341 de 2008)",
        items: [
          { n: 21, texto: "Tiene Plan de Emergencia y Contingencias (PEC)" },
          { n: 22, texto: "El Plan de Emergencia y Contingencias es conocido por todo el personal" }
        ]
      },
      {
        subtitulo: "SALIDAS DE EVACUACIÓN (Título K 3.2 NSR-10/NSR-98 — Res. 2400/1979 art. 16 y 207 — Ley 361/1997)",
        items: [
          { n: 23, texto: "Tiene suficientes salidas para una posible evacuación de emergencia" },
          { n: 24, texto: "Los pasillos y salidas se encuentran despejados, libres de obstáculos" },
          { n: 25, texto: "La salida es lo suficientemente amplia para una evacuación de emergencia" },
          { n: 26, texto: "Los pasillos y salidas están señalizadas" },
          { n: 27, texto: "El acceso a la(s) salida(s) dirige a un sitio seguro" },
          { n: 28, texto: "Los pasillos y salidas de evacuación tienen suficiente iluminación" },
          { n: 29, texto: "Facilita el acceso y evacuación de personas con movilidad reducida" }
        ]
      },
      {
        subtitulo: "SEÑALIZACIÓN, ILUMINACIÓN Y VENTILACIÓN (Título K 3.2/3.9/3.10/3.2.4 NSR-10/98 — Res. 2400 art. 71 — NTC 1461)",
        items: [
          { n: 30, texto: "La señalización indica la evacuación a un lugar seguro" },
          { n: 31, texto: "Cuenta con iluminación de emergencia independiente del servicio de energía propio" },
          { n: 32, texto: "La ventilación es adecuada de acuerdo al proceso desarrollado" }
        ]
      },
      {
        subtitulo: "ESCALERAS Y RAMPAS / OTROS ELEMENTOS DE TRANSPORTE VERTICAL (Título K 3.8 NSR-10/98)",
        items: [
          { n: 33, texto: "Posee escaleras como medio de evacuación" },
          { n: 34, texto: "Las escaleras son lo suficientemente amplias" },
          { n: 35, texto: "Las escaleras poseen pasamanos adecuados" },
          { n: 36, texto: "Tiene escaleras presurizadas" },
          { n: 37, texto: "Cuentan las escaleras con bordes rígidos antideslizantes" },
          { n: 38, texto: "El ancho de la huella de la escalera es correcto" },
          { n: 39, texto: "El alto de la contrahuella es adecuado" },
          { n: 40, texto: "Las escaleras exteriores son adecuadas para usarse como salida" },
          { n: 41, texto: "El material de las escaleras es adecuado" }
        ]
      },
      {
        subtitulo: "PUERTAS DE SALIDA (Título K 3.8 NSR-10/98)",
        items: [
          { n: 42, texto: "El ancho y alto de las puertas es el adecuado" },
          { n: 43, texto: "La distancia entre puertas en serie es la adecuada" },
          { n: 44, texto: "Tiene puertas giratorias o plegables como salida" },
          { n: 45, texto: "Las puertas para ocupaciones mayores a cien (100) abren en sentido de evacuación" },
          { n: 46, texto: "Tiene puertas de vaivén para ocupaciones mayores a cien (100) personas" },
          { n: 47, texto: "Tiene el mismo ancho a ambos lados de la puerta" }
        ]
      }
    ]
  },
  {
    id: "C",
    titulo: "C. MATERIALES INFLAMABLES Y COMBUSTIBLES (Título J NSR-10/98 — Res. 2400/79 — NTC 2505 — Res. 1023-04 — Res. 80505-97)",
    grupos: [
      {
        subtitulo: null,
        items: [
          { n: 48, texto: "El establecimiento posee calderas" },
          { n: 49, texto: "Se ha efectuado prueba hidrostática a la caldera" },
          { n: 50, texto: "Cuenta con los registros de mantenimiento realizados a esta" },
          { n: 51, texto: "Tiene líquidos inflamables (gasolina, alcohol industrial, thinner, pegantes, PVC, otros)" },
          { n: 52, texto: "Almacena adecuadamente líquidos inflamables (gasolina, alcohol industrial, thinner, pegantes, PVC, otros)", extra: { id: "cantidad_aprox_52", label: "Cantidad aprox.", type: "text" } },
          { n: 53, texto: "Tiene líquidos combustibles (ACPM, aceites lubricantes, grasas, ceras, otros) almacenados" },
          { n: 54, texto: "Almacena adecuadamente líquidos combustibles (ACPM, aceites lubricantes, grasas, ceras, otros)", extra: { id: "cantidad_aprox_54", label: "Cantidad aprox.", type: "text" } },
          { n: 55, texto: "Tiene instalación de gas natural combustible (GNC)" },
          { n: 56, texto: "Tiene instalación de gas licuado del petróleo (propano) en tanques o cilindros de manera adecuada" },
          { n: 57, texto: "Los sistemas y acometidas de gases están debidamente instalados (tuberías, válvulas, medidores, tanques)" },
          { n: 58, texto: "Almacena productos sólidos (parafinas, velas, papelería, carbón, madera, leña, similares)" }
        ]
      }
    ]
  },
  {
    id: "D",
    titulo: "D. RIESGOS COMUNES DE INCENDIO (RETIE — Res. 2400/79 — NTC 2050)",
    grupos: [
      {
        subtitulo: null,
        items: [
          { n: 59, texto: "Tiene riesgos por fuentes de iluminación dentro del establecimiento (lámparas, bombillos, avisos luminosos, otros)" },
          { n: 60, texto: "Tiene dentro de su establecimiento llamas abiertas (fogones, velas, chimeneas, pebeteros)" },
          { n: 61, texto: "Tiene superficies calientes (radiadores, planchas, tuberías de vapor, otras)" },
          { n: 62, texto: "Existen riesgos por radiaciones" },
          { n: 63, texto: "Se presentan riesgos por tomas eléctricas recargadas" },
          { n: 64, texto: "Posee instalaciones eléctricas improvisadas" },
          { n: 65, texto: "Cuenta con sistemas de prevención electrostática puesta a tierra" },
          { n: 66, texto: "Se presentan riesgos por el mal almacenamiento de desechos y basuras" },
          { n: 67, texto: "Este establecimiento está libre de humo de tabaco y/o cigarrillo" }
        ]
      }
    ]
  },
  {
    id: "E",
    titulo: "E. EQUIPOS DE CONTROL DE INCENDIOS",
    grupos: [
      {
        subtitulo: "SISTEMAS DE TOMAS DE AGUA FIJAS (GABINETES CONTRA INCENDIO) Y CONEXIÓN PARA BOMBEROS (Título J NSR-10, NFPA 14)",
        items: [
          { n: 68, texto: "La edificación requiere instalar sistema de tomas fijas de agua" },
          { n: 69, texto: "La edificación cuenta con sistemas de tomas fijas de agua" },
          { n: 70, texto: "La clase de sistema instalado es adecuado conforme al riesgo que protege (Clase I 1½\", Clase II 2½\", Clase III 1½\"–2½\")" },
          { n: 71, texto: "El sistema instalado tiene cobertura total de la edificación (alcance de gabinete 40 m)" },
          { n: 72, texto: "La altura de las válvulas instaladas es adecuada (1–1,7 m)" },
          { n: 73, texto: "Funciona correctamente el sistema (verificación de presiones 54–99 PSI y flujo)" },
          { n: 74, texto: "Las tomas de agua (gabinetes) están completamente equipadas" },
          { n: 75, texto: "Los elementos del gabinete se encuentran en buen estado" },
          { n: 76, texto: "El sistema posee tanque de reserva autónomo", extra: { id: "tanque_76", label: "Tanque", type: "select", options: ["Elevado", "Enterrado"] } },
          { n: 77, texto: "El sistema posee tanque de reserva compartido para incendio y agua potable del edificio", extra: { id: "tanque_77", label: "Tanque", type: "select", options: ["Elevado", "Enterrado"] } },
          { n: 78, texto: "Capacidad del tanque instalado (m³)", onlyNumeric: true, extra: { id: "capacidad_tanque_78", label: "Capacidad (m³)", type: "number" } },
          { n: 79, texto: "La edificación posee conexión para el uso de bomberos (válvula siamesa)" },
          { n: 80, texto: "Le han sido efectuadas pruebas periódicas al sistema (pitométrica y/o hidrostática)" }
        ]
      },
      {
        subtitulo: "SISTEMA DE ROCIADORES AUTOMÁTICOS (Título J NSR-10, NFPA 13 — Res. 2400/1979 art. 233 — Ley 400/1997, NSR-98 J.2.8.1.2)",
        items: [
          { n: 81, texto: "La edificación requiere instalar sistema de rociadores" },
          { n: 82, texto: "La edificación cuenta con sistema de rociadores" },
          { n: 83, texto: "Después de instalado el sistema, se le efectuaron pruebas para comprobar su correcto funcionamiento" },
          { n: 84, texto: "El sistema cubre las áreas requeridas de la edificación" },
          { n: 85, texto: "El sistema está correctamente instalado" },
          { n: 86, texto: "Los rociadores se encuentran en buen estado" }
        ]
      },
      {
        subtitulo: "SISTEMA DE DETECCIÓN Y ALARMA (Título J NSR-10, NFPA 72 — Res. 2400/1979 art. 231)",
        items: [
          { n: 87, texto: "La edificación requiere instalar sistemas de detección y alarma automática de incendio" },
          { n: 88, texto: "La edificación cuenta con sistema de detección y alarma" },
          { n: 89, texto: "La edificación cuenta con estaciones manuales" },
          { n: 90, texto: "La altura de las estaciones manuales es adecuada (1–1,5 m)" },
          { n: 91, texto: "Los detectores cumplen los requerimientos de distancia y ubicación" },
          { n: 92, texto: "Cuenta con señal normalizada para evacuación" },
          { n: 93, texto: "La señal de alarma es fuerte e inequívoca" }
        ]
      }
    ]
  }
];

// Sección de extintores: encabezado SI/NO/OBSERVACIONES (sin NA)
const EXTINTORES_ITEMS = [
  { n: 94, texto: "Los extintores son adecuados al tipo de riesgo" },
  { n: 95, texto: "Se encuentran en buen estado" },
  { n: 96, texto: "Tienen revisión vigente" },
  { n: 97, texto: "Cuenta con extintores suficientes" },
  { n: 98, texto: "Se encuentran debidamente ubicados" },
  { n: 99, texto: "El personal conoce el manejo correcto del extintor" },
  { n: 100, texto: "Existe facilidad de acceso a los extintores" },
  { n: 101, texto: "Los extintores están libres de obstáculos" },
  { n: 102, texto: "Es fácilmente visible" },
  { n: 103, texto: "Está cerca de los trayectos normales de recorrido" },
  { n: 104, texto: "Están expuestos a daños" },
  { n: 105, texto: "La altura de ubicación es de (cm)", onlyNumeric: true, extra: { id: "altura_105", label: "Altura (cm)", type: "number" } },
  { n: 106, texto: "Se encuentran correctamente señalizados" },
  { n: 107, texto: "Se les ha practicado prueba de inspección y mantenimiento" }
];

// Tabla 108: tipos de extintores con capacidad/cantidad.
const TIPOS_EXTINTORES = [
  "A - Agua a presión",
  "BC - Polvo Químico Seco",
  "ABC - Polvo Químico Seco",
  "CO2 - Dióxido de Carbono",
  "K - Químico Húmedo",
  "Halón (1211, 1301, etc.)",
  "Halocarbono (FC, etc.)",
  "AFFF - Espuma Formadora de Película",
  "FFFP - Espuma Fluoroproteínica",
  "Satélite o Carretilla",
  "Otro"
];

const FORM_TOTALS = {
  firstPageItems: 67, // ítems 0-67 (conflicto + A + B + C + D) van en la primera página / comprobante
};
