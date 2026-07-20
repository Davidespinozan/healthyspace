import { describe, it, expect } from 'vitest';
import {
  resumen, porMetodo, porRemolque, topPlatillos, variacionVsAyer,
  pedidosAtorados, ventasSinMetodo, cajasSinCerrar, arqueosConDiferencia,
  type OrderRow, type CierreRow,
} from '../metrics';

const hace = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const ayer = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString(); };

const o = (p: Partial<OrderRow>): OrderRow => ({
  id: '1', code: 'X', mode: 'pickup', items: [], total: 100,
  branch: 'las-quintas', status: 'recibido', created_at: hace(1), ...p,
});

describe('métricas del food truck', () => {
  it('el resumen ignora los cancelados', () => {
    const r = resumen([o({ total: 100 }), o({ total: 200 }), o({ total: 999, status: 'cancelado' })]);
    expect(r.total).toBe(300);
    expect(r.pedidos).toBe(2);
    expect(r.ticket).toBe(150);
  });

  it('agrupa por método de pago y deja aparte lo no registrado', () => {
    const r = porMetodo([
      o({ total: 100, payment_method: 'efectivo' }),
      o({ total: 50, payment_method: 'efectivo' }),
      o({ total: 300, payment_method: 'clip' }),
      o({ total: 70 }),                                   // sin método
    ]);
    expect(r.find((x) => x.metodo === 'efectivo')).toEqual({ metodo: 'efectivo', total: 150, n: 2 });
    expect(r[0].metodo).toBe('clip');                     // ordenado por monto
    expect(r.find((x) => x.metodo === 'sin')?.total).toBe(70);
  });

  it('agrupa por remolque', () => {
    const r = porRemolque([o({ total: 100 }), o({ total: 400, branch: 'tres-rios' })]);
    expect(r[0]).toEqual({ branch: 'tres-rios', total: 400, n: 1 });
  });

  it('cuenta lo más vendido sumando cantidades', () => {
    const r = topPlatillos([
      o({ items: [{ name: 'Fuego', qty: 2, price: 169 }] }),
      o({ items: [{ name: 'Fuego', qty: 1, price: 169 }, { name: 'Verde', qty: 4, price: 169 }] }),
    ]);
    expect(r[0]).toEqual({ name: 'Verde', qty: 4, total: 676 });
    expect(r[1].qty).toBe(3);
  });

  it('compara hoy contra ayer', () => {
    const v = variacionVsAyer([o({ total: 150 }), o({ total: 100, created_at: ayer() })]);
    expect(v.hoy).toBe(150);
    expect(v.ayer).toBe(100);
    expect(v.pct).toBe(50);
  });

  it('detecta pedidos atorados y no cuenta los terminados', () => {
    const r = pedidosAtorados([
      o({ code: 'VIEJO', created_at: hace(40) }),
      o({ code: 'NUEVO', created_at: hace(3) }),
      o({ code: 'LISTO', created_at: hace(90), status: 'entregado' }),
    ]);
    expect(r.map((x) => x.code)).toEqual(['VIEJO']);
    expect(r[0].min).toBeGreaterThanOrEqual(40);
  });

  it('detecta ventas de mostrador sin método de pago', () => {
    const r = ventasSinMetodo([
      o({ code: 'A', channel: 'mostrador' }),
      o({ code: 'B', channel: 'mostrador', payment_method: 'efectivo' }),
      o({ code: 'C', channel: 'app' }),                   // la app no cobra en caja
    ]);
    expect(r.map((x) => x.code)).toEqual(['A']);
  });

  it('avisa qué remolque tuvo efectivo y no cerró caja', () => {
    const orders = [
      o({ branch: 'las-quintas', payment_method: 'efectivo' }),
      o({ branch: 'tres-rios', payment_method: 'efectivo' }),
    ];
    const cierres: CierreRow[] = [
      { branch: 'tres-rios', cerrado_en: new Date().toISOString(), diferencia: 0, motivo: null },
    ];
    expect(cajasSinCerrar(orders, cierres, ['las-quintas', 'tres-rios', 'la-primavera']))
      .toEqual(['las-quintas']);
  });

  it('lista los arqueos que no cuadraron', () => {
    const c: CierreRow[] = [
      { branch: 'a', cerrado_en: '', diferencia: 0, motivo: null },
      { branch: 'b', cerrado_en: '', diferencia: -50, motivo: 'cambio' },
      { branch: 'c', cerrado_en: '', diferencia: 30, motivo: 'x' },
    ];
    expect(arqueosConDiferencia(c).map((x) => x.branch)).toEqual(['b', 'c']);
  });
});
