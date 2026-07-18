-- El cliente anónimo solo puede crear pedidos DE LA APP y sin cobrar: los campos
-- de dinero cobrado (canal, método de pago, pagado, quién cobró) son del staff.
-- Sin esto, cualquiera podría inventar ventas de mostrador "pagadas" e inflar
-- los reportes de administración.
drop policy if exists "truck_orders anon insert" on public.truck_orders;
create policy "truck_orders anon insert" on public.truck_orders for insert to anon
with check (
  channel = 'app'
  and paid = false
  and payment_method is null
  and cash_received is null
  and staff_id is null
  and status = 'recibido'
);
