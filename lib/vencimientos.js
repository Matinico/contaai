// Tabla de vencimientos IVA 2026 por mes de pago y grupo de CUIT
// Índice 0 = Enero … 11 = Diciembre
// Columnas: [grupo 0-3, grupo 4-6, grupo 7-9]
const TABLA = [
  [19, 20, 21], // Enero
  [18, 19, 20], // Febrero
  [18, 19, 20], // Marzo
  [20, 21, 22], // Abril
  [18, 19, 20], // Mayo
  [18, 19, 22], // Junio
  [20, 21, 22], // Julio
  [18, 19, 20], // Agosto
  [18, 21, 22], // Septiembre
  [19, 20, 21], // Octubre
  [18, 19, 20], // Noviembre
  [18, 21, 22], // Diciembre
];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function grupoCuit(cuit) {
  const d = String(cuit || '').replace(/\D/g, '');
  if (!d) return 0;
  const last = parseInt(d.slice(-1), 10);
  if (last <= 3) return 0;
  if (last <= 6) return 1;
  return 2;
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

// mesPago: 0-indexed (0=enero … 11=diciembre) — mes en que vence el IVA
// Devuelve la fecha exacta de vencimiento en 2026
export function vencimientoIVA(cuit, mesPago) {
  const dia = TABLA[mesPago][grupoCuit(cuit)];
  return new Date(2026, mesPago, dia);
}

// Nombre del período cubierto (mes anterior al de pago)
export function periodoLabel(mesPago) {
  return MESES[(mesPago + 11) % 12];
}

export function mesPagoLabel(mesPago) {
  return MESES[mesPago];
}

function buildVencimientos(clientes) {
  const hoy = startOfDay(new Date());
  const result = [];

  for (const cliente of (clientes || [])) {
    for (const empresa of (cliente.empresas || [])) {
      if (!empresa.cuit) continue;
      for (let mes = 0; mes < 12; mes++) {
        const fecha = vencimientoIVA(empresa.cuit, mes);
        const diasRestantes = Math.ceil((fecha - hoy) / 86400000);
        result.push({
          clienteId: cliente.id,
          clienteNombre: cliente.nombre,
          empresaNombre: empresa.nombre_empresa,
          cuit: empresa.cuit,
          fecha,
          mesPago: mes,
          periodo: periodoLabel(mes),
          diasRestantes,
        });
      }
    }
  }

  return result.sort((a, b) => a.fecha - b.fecha || a.clienteNombre.localeCompare(b.clienteNombre));
}

// Vencimientos dentro de los próximos `dias` días (desde hoy inclusive)
export function proximosVencimientos(clientes, dias = 60) {
  const hoy = startOfDay(new Date());
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + dias);
  return buildVencimientos(clientes).filter(v => v.fecha >= hoy && v.fecha <= limite);
}

// Todos los vencimientos 2026 para todos los clientes
export function todosLosVencimientos(clientes) {
  return buildVencimientos(clientes);
}
