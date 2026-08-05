-- Demo data previously seeded only two leads (web_form, phone) and no
-- conversation/message thread at all, so a first-time user never actually
-- saw what a WhatsApp or email exchange looks like in the app — the whole
-- point of demo mode. Adds one example lead per real-or-simulated inbound
-- channel (web form, transcribed phone call, WhatsApp, email), each with a
-- realistic conversation thread underneath (src/app/[locale]/(app)/leads/
-- [id]/page.tsx only renders a thread when a conversations row exists for
-- the lead — there was none before this).
create or replace function public.seed_demo_data(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_id uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid; c7 uuid; c8 uuid;
  v1 uuid; v2 uuid; v3 uuid; v4 uuid; v5 uuid; v6 uuid; v7 uuid; v8 uuid; v9 uuid; v10 uuid;
  wo1 uuid; wo2 uuid; wo3 uuid; wo4 uuid; wo5 uuid; wo6 uuid;
  q1 uuid; q2 uuid; q3 uuid;
  inv1 uuid; inv2 uuid; inv3 uuid; inv4 uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid; p7 uuid; p8 uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid;
  conv uuid;
  num text;
begin
  if public.current_user_role(p_organization_id) not in ('owner', 'admin') then
    raise exception 'not authorized to seed demo data for organization %', p_organization_id;
  end if;

  select id into v_service_id from public.services
  where organization_id = p_organization_id order by created_at limit 1;

  -- Customers -----------------------------------------------------------
  insert into public.customers (organization_id, first_name, last_name, phone, email, preferred_language, consent, is_demo, created_at, updated_at)
  values (p_organization_id, 'Jean', 'Dupont', '+32 470 12 34 56', 'jean.dupont@example.com', 'fr', true, true, now() - interval '52 days', now() - interval '52 days')
  returning id into c1;
  insert into public.customers (organization_id, first_name, last_name, phone, email, preferred_language, consent, is_demo, created_at, updated_at)
  values (p_organization_id, 'Marie', 'Lambert', '+32 471 22 33 44', 'marie.lambert@example.com', 'fr', true, true, now() - interval '48 days', now() - interval '48 days')
  returning id into c2;
  insert into public.customers (organization_id, first_name, last_name, phone, email, preferred_language, consent, is_demo, created_at, updated_at)
  values (p_organization_id, 'Ahmed', 'El Idrissi', '+32 472 33 44 55', 'ahmed.elidrissi@example.com', 'fr', true, true, now() - interval '40 days', now() - interval '40 days')
  returning id into c3;
  insert into public.customers (organization_id, first_name, last_name, phone, email, preferred_language, consent, is_demo, created_at, updated_at)
  values (p_organization_id, 'Sophie', 'Van den Berg', '+32 473 44 55 66', 'sophie.vandenberg@example.com', 'nl', true, true, now() - interval '33 days', now() - interval '33 days')
  returning id into c4;
  insert into public.customers (organization_id, first_name, last_name, phone, email, preferred_language, consent, is_demo, created_at, updated_at)
  values (p_organization_id, 'Thomas', 'Willems', '+32 474 55 66 77', 'thomas.willems@example.com', 'nl', true, true, now() - interval '27 days', now() - interval '27 days')
  returning id into c5;
  insert into public.customers (organization_id, first_name, last_name, phone, email, preferred_language, consent, is_demo, created_at, updated_at)
  values (p_organization_id, 'Isabelle', 'Michel', '+32 475 66 77 88', 'isabelle.michel@example.com', 'fr', true, true, now() - interval '19 days', now() - interval '19 days')
  returning id into c6;
  insert into public.customers (organization_id, first_name, last_name, phone, email, preferred_language, consent, is_demo, created_at, updated_at)
  values (p_organization_id, 'Karim', 'Benali', '+32 476 77 88 99', 'karim.benali@example.com', 'fr', true, true, now() - interval '11 days', now() - interval '11 days')
  returning id into c7;
  insert into public.customers (organization_id, first_name, last_name, phone, email, preferred_language, consent, is_demo, created_at, updated_at)
  values (p_organization_id, 'Els', 'Peeters', '+32 477 88 99 00', 'els.peeters@example.com', 'nl', true, true, now() - interval '5 days', now() - interval '5 days')
  returning id into c8;

  -- Vehicles --------------------------------------------------------------
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c1, '1-ABC-123', 'Volkswagen', 'Golf', 2019, 'diesel', 78500, 'Gris', true, now() - interval '52 days', now() - interval '2 days')
  returning id into v1;
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c1, '1-XYZ-456', 'BMW', 'Serie 3', 2021, 'essence', 32000, 'Noir', true, now() - interval '52 days', now() - interval '20 days')
  returning id into v2;
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c2, '2-DEF-789', 'Renault', 'Clio', 2018, 'essence', 95000, 'Rouge', true, now() - interval '48 days', now() - interval '4 days')
  returning id into v3;
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c2, '3-YZA-357', 'Skoda', 'Octavia', 2020, 'diesel', 54000, 'Blanc', true, now() - interval '48 days', now() - interval '48 days')
  returning id into v4;
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c3, '3-GHI-321', 'Peugeot', '308', 2020, 'diesel', 61000, 'Bleu', true, now() - interval '40 days', now() - interval '40 days')
  returning id into v5;
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c4, '1-JKL-654', 'Audi', 'A4', 2017, 'diesel', 142000, 'Gris', true, now() - interval '33 days', now() - interval '6 days')
  returning id into v6;
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c5, '2-MNO-987', 'Toyota', 'Yaris', 2022, 'hybride', 15000, 'Blanc', true, now() - interval '27 days', now() - interval '27 days')
  returning id into v7;
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c6, '3-PQR-159', 'Ford', 'Focus', 2019, 'essence', 88000, 'Noir', true, now() - interval '19 days', now() - interval '8 days')
  returning id into v8;
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c7, '1-STU-753', 'Mercedes-Benz', 'Classe C', 2016, 'diesel', 168000, 'Gris', true, now() - interval '11 days', now() - interval '11 days')
  returning id into v9;
  insert into public.vehicles (organization_id, customer_id, license_plate, make, model, year, fuel, mileage, color, is_demo, created_at, updated_at)
  values (p_organization_id, c8, '2-VWX-951', 'Opel', 'Corsa', 2021, 'essence', 28000, 'Rouge', true, now() - interval '5 days', now() - interval '5 days')
  returning id into v10;

  -- Leads ---------------------------------------------------------------------
  -- One example per real-or-simulated inbound channel, so a new user sees
  -- what each one actually looks like instead of an empty inbox: the public
  -- web form, a transcribed phone call (src/app/api/telephony/gather), a
  -- WhatsApp message, and an email — each with its own conversation/message
  -- thread below so opening the lead shows a real-looking exchange.
  insert into public.leads (organization_id, customer_id, vehicle_id, channel, status, urgency, category, description, is_demo, created_at, updated_at)
  values (p_organization_id, c8, v10, 'web_form', 'new', 'high', 'Freinage', 'Bruit metallique au freinage depuis 2 jours, la cliente s''inquiete pour la securite.', true, now() - interval '1 day', now() - interval '1 day')
  returning id into l1;
  insert into public.leads (organization_id, customer_id, vehicle_id, channel, status, urgency, category, description, is_demo, created_at, updated_at)
  values (p_organization_id, c5, v7, 'phone', 'qualifying', 'normal', 'Entretien', 'Bonjour, je voudrais un devis pour un entretien, je suis a environ 15000 kilometres depuis le dernier.', true, now() - interval '3 days', now() - interval '2 days')
  returning id into l2;
  insert into public.leads (organization_id, customer_id, vehicle_id, channel, status, urgency, category, description, is_demo, created_at, updated_at)
  values (p_organization_id, c3, v5, 'whatsapp', 'qualifying', 'normal', 'Climatisation', 'Bonjour, la clim de ma voiture ne souffle plus froid du tout depuis ce matin. Vous avez de la place cette semaine ?', true, now() - interval '2 days', now() - interval '2 days')
  returning id into l3;
  insert into public.leads (organization_id, customer_id, vehicle_id, channel, status, urgency, category, description, is_demo, created_at, updated_at)
  values (p_organization_id, c4, v6, 'email', 'won', 'low', 'Carrosserie', 'Bonjour, suite a notre echange telephonique, je confirme le rendez-vous pour le remplacement du retroviseur cote passager. Cordialement.', true, now() - interval '9 days', now() - interval '6 days')
  returning id into l4;

  -- Conversations & messages ---------------------------------------------------
  insert into public.conversations (organization_id, customer_id, lead_id, channel, last_message_at)
  values (p_organization_id, c8, l1, 'web_form', now() - interval '1 day') returning id into conv;
  insert into public.messages (organization_id, conversation_id, direction, body, is_ai_generated, read)
  values (p_organization_id, conv, 'inbound', 'Bruit metallique au freinage depuis 2 jours, la cliente s''inquiete pour la securite.', false, true);

  insert into public.conversations (organization_id, customer_id, lead_id, channel, last_message_at)
  values (p_organization_id, c5, l2, 'phone', now() - interval '2 days') returning id into conv;
  insert into public.messages (organization_id, conversation_id, direction, body, is_ai_generated, read)
  values (p_organization_id, conv, 'inbound', 'Bonjour, je voudrais un devis pour un entretien, je suis a environ 15000 kilometres depuis le dernier.', false, true);

  insert into public.conversations (organization_id, customer_id, lead_id, channel, last_message_at)
  values (p_organization_id, c3, l3, 'whatsapp', now() - interval '2 days' + interval '20 minutes') returning id into conv;
  insert into public.messages (organization_id, conversation_id, direction, body, is_ai_generated, read, created_at)
  values (p_organization_id, conv, 'inbound', 'Bonjour, la clim de ma voiture ne souffle plus froid du tout depuis ce matin. Vous avez de la place cette semaine ?', false, true, now() - interval '2 days');
  insert into public.messages (organization_id, conversation_id, direction, body, is_ai_generated, read, created_at)
  values (p_organization_id, conv, 'outbound', 'Bonjour ! Oui, on peut regarder ca jeudi matin. Vous pouvez passer vers 9h ?', true, true, now() - interval '2 days' + interval '15 minutes');
  insert into public.messages (organization_id, conversation_id, direction, body, is_ai_generated, read, created_at)
  values (p_organization_id, conv, 'inbound', 'Parfait, jeudi 9h ca me va, merci !', false, true, now() - interval '2 days' + interval '20 minutes');

  insert into public.conversations (organization_id, customer_id, lead_id, channel, last_message_at)
  values (p_organization_id, c4, l4, 'email', now() - interval '6 days') returning id into conv;
  insert into public.messages (organization_id, conversation_id, direction, body, is_ai_generated, read, created_at)
  values (p_organization_id, conv, 'inbound', 'Bonjour, suite a notre echange telephonique, je confirme le rendez-vous pour le remplacement du retroviseur cote passager. Cordialement.', false, true, now() - interval '9 days');
  insert into public.messages (organization_id, conversation_id, direction, body, is_ai_generated, read, created_at)
  values (p_organization_id, conv, 'outbound', 'Bonjour, c''est bien note, a bientot. Cordialement, l''equipe.', true, true, now() - interval '6 days');

  -- Appointments --------------------------------------------------------------
  insert into public.appointments (organization_id, customer_id, vehicle_id, service_id, starts_at, ends_at, status, notes, is_demo, created_at, updated_at)
  values (p_organization_id, c1, v1, v_service_id, now() - interval '20 days', now() - interval '20 days' + interval '1 hour', 'completed', 'Controle courroie de distribution', true, now() - interval '22 days', now() - interval '20 days');
  insert into public.appointments (organization_id, customer_id, vehicle_id, service_id, starts_at, ends_at, status, notes, is_demo, created_at, updated_at)
  values (p_organization_id, c6, v8, v_service_id, now() - interval '8 days', now() - interval '8 days' + interval '1 hour', 'completed', 'Revision complete', true, now() - interval '10 days', now() - interval '8 days');
  insert into public.appointments (organization_id, customer_id, vehicle_id, service_id, starts_at, ends_at, status, notes, is_demo, created_at, updated_at)
  values (p_organization_id, c2, v3, v_service_id, now() + interval '2 days', now() + interval '2 days' + interval '1 hour', 'confirmed', 'Vidange + plaquettes de frein', true, now() - interval '4 days', now() - interval '4 days');
  insert into public.appointments (organization_id, customer_id, vehicle_id, service_id, starts_at, ends_at, status, notes, is_demo, created_at, updated_at)
  values (p_organization_id, c8, v10, v_service_id, now() + interval '4 days', now() + interval '4 days' + interval '1 hour', 'confirmed', 'Diagnostic bruit de freinage', true, now() - interval '1 day', now() - interval '1 day');

  -- Work orders (spanning the workflow, + short status history each) --------
  insert into public.work_orders (organization_id, customer_id, vehicle_id, status, title, description, mileage, is_demo, created_at, updated_at)
  values (p_organization_id, c1, v1, 'received', 'Bruit suspect au freinage', 'Client signale un grincement au freinage avant depuis quelques jours.', 78500, true, now() - interval '2 days', now() - interval '2 days')
  returning id into wo1;
  insert into public.work_order_status_history (organization_id, work_order_id, status, created_at)
  values (p_organization_id, wo1, 'received', now() - interval '2 days');

  insert into public.work_orders (organization_id, customer_id, vehicle_id, status, title, description, mileage, is_demo, created_at, updated_at)
  values (p_organization_id, c2, v3, 'repair_in_progress', 'Vidange + plaquettes de frein', 'Vidange complete et remplacement des plaquettes avant.', 95000, true, now() - interval '4 days', now() - interval '1 day')
  returning id into wo2;
  insert into public.work_order_status_history (organization_id, work_order_id, status, created_at) values
    (p_organization_id, wo2, 'received', now() - interval '4 days'),
    (p_organization_id, wo2, 'parts_ordered', now() - interval '3 days'),
    (p_organization_id, wo2, 'repair_in_progress', now() - interval '1 day');

  insert into public.work_orders (organization_id, customer_id, vehicle_id, status, title, description, mileage, is_demo, created_at, updated_at)
  values (p_organization_id, c4, v6, 'awaiting_customer_approval', 'Diagnostic embrayage', 'Embrayage qui patine en cote, devis envoye pour validation.', 142000, true, now() - interval '6 days', now() - interval '2 days')
  returning id into wo3;
  insert into public.work_order_status_history (organization_id, work_order_id, status, created_at) values
    (p_organization_id, wo3, 'received', now() - interval '6 days'),
    (p_organization_id, wo3, 'diagnostic_done', now() - interval '3 days'),
    (p_organization_id, wo3, 'awaiting_customer_approval', now() - interval '2 days');

  insert into public.work_orders (organization_id, customer_id, vehicle_id, status, title, description, mileage, is_demo, created_at, updated_at)
  values (p_organization_id, c6, v8, 'ready_for_delivery', 'Revision complete', 'Revision generale 88 000 km, tous les points controles.', 88000, true, now() - interval '8 days', now() - interval '1 day')
  returning id into wo4;
  insert into public.work_order_status_history (organization_id, work_order_id, status, created_at) values
    (p_organization_id, wo4, 'received', now() - interval '8 days'),
    (p_organization_id, wo4, 'repair_in_progress', now() - interval '5 days'),
    (p_organization_id, wo4, 'final_control', now() - interval '2 days'),
    (p_organization_id, wo4, 'ready_for_delivery', now() - interval '1 day');

  insert into public.work_orders (organization_id, customer_id, vehicle_id, status, title, description, mileage, is_demo, created_at, updated_at)
  values (p_organization_id, c1, v2, 'delivered', 'Changement courroie de distribution', 'Remplacement complet du kit de distribution.', 32000, true, now() - interval '22 days', now() - interval '20 days')
  returning id into wo5;
  insert into public.work_order_status_history (organization_id, work_order_id, status, created_at) values
    (p_organization_id, wo5, 'received', now() - interval '22 days'),
    (p_organization_id, wo5, 'repair_in_progress', now() - interval '21 days'),
    (p_organization_id, wo5, 'ready_for_delivery', now() - interval '20 days'),
    (p_organization_id, wo5, 'delivered', now() - interval '20 days');

  insert into public.work_orders (organization_id, customer_id, vehicle_id, status, title, description, mileage, is_demo, created_at, updated_at)
  values (p_organization_id, c8, v10, 'delivered', 'Batterie + diagnostic electrique', 'Batterie a plat, remplacee + controle du circuit de charge.', 27500, true, now() - interval '35 days', now() - interval '33 days')
  returning id into wo6;
  insert into public.work_order_status_history (organization_id, work_order_id, status, created_at) values
    (p_organization_id, wo6, 'received', now() - interval '35 days'),
    (p_organization_id, wo6, 'repair_in_progress', now() - interval '34 days'),
    (p_organization_id, wo6, 'delivered', now() - interval '33 days');

  -- Quotes ------------------------------------------------------------------
  num := public.next_quote_number(p_organization_id);
  insert into public.quotes (organization_id, quote_number, customer_id, vehicle_id, work_order_id, status, subtotal, vat_rate, vat_amount, total, is_demo, created_at, updated_at)
  values (p_organization_id, num, c4, v6, wo3, 'sent', 620.00, 21.00, 130.20, 750.20, true, now() - interval '3 days', now() - interval '2 days')
  returning id into q1;
  insert into public.quote_line_items (organization_id, quote_id, description, kind, quantity, unit_price, sort_order)
  values
    (p_organization_id, q1, 'Kit embrayage complet', 'part', 1, 420.00, 0),
    (p_organization_id, q1, 'Main d''oeuvre remplacement embrayage', 'labor', 3, 66.67, 1);

  num := public.next_quote_number(p_organization_id);
  insert into public.quotes (organization_id, quote_number, customer_id, vehicle_id, status, subtotal, vat_rate, vat_amount, total, is_demo, created_at, updated_at)
  values (p_organization_id, num, c3, v5, 'draft', 145.00, 21.00, 30.45, 175.45, true, now() - interval '1 day', now() - interval '1 day')
  returning id into q2;
  insert into public.quote_line_items (organization_id, quote_id, description, kind, quantity, unit_price, sort_order)
  values
    (p_organization_id, q2, 'Filtre a air + filtre habitacle', 'part', 1, 65.00, 0),
    (p_organization_id, q2, 'Main d''oeuvre', 'labor', 1, 80.00, 1);

  num := public.next_quote_number(p_organization_id);
  insert into public.quotes (organization_id, quote_number, customer_id, vehicle_id, status, subtotal, vat_rate, vat_amount, total, is_demo, created_at, updated_at)
  values (p_organization_id, num, c2, v3, 'accepted', 210.00, 21.00, 44.10, 254.10, true, now() - interval '4 days', now() - interval '3 days')
  returning id into q3;
  insert into public.quote_line_items (organization_id, quote_id, description, kind, quantity, unit_price, sort_order)
  values
    (p_organization_id, q3, 'Vidange huile + filtre', 'part', 1, 90.00, 0),
    (p_organization_id, q3, 'Plaquettes de frein avant', 'part', 1, 60.00, 1),
    (p_organization_id, q3, 'Main d''oeuvre', 'labor', 1, 60.00, 2);

  -- Invoices ------------------------------------------------------------------
  num := public.next_invoice_number(p_organization_id);
  insert into public.invoices (organization_id, invoice_number, customer_id, vehicle_id, work_order_id, status, issue_date, due_date, subtotal, vat_rate, vat_amount, total, paid_amount, paid_at, is_demo, created_at, updated_at)
  values (p_organization_id, num, c1, v2, wo5, 'paid', (now() - interval '20 days')::date, (now() - interval '5 days')::date, 480.00, 21.00, 100.80, 580.80, 580.80, now() - interval '18 days', true, now() - interval '20 days', now() - interval '18 days')
  returning id into inv1;
  insert into public.invoice_line_items (organization_id, invoice_id, description, kind, quantity, unit_price, sort_order)
  values
    (p_organization_id, inv1, 'Kit distribution complet', 'part', 1, 340.00, 0),
    (p_organization_id, inv1, 'Main d''oeuvre remplacement distribution', 'labor', 2, 70.00, 1);
  insert into public.invoice_payments (organization_id, invoice_id, amount, paid_at)
  values (p_organization_id, inv1, 580.80, now() - interval '18 days');

  num := public.next_invoice_number(p_organization_id);
  insert into public.invoices (organization_id, invoice_number, customer_id, vehicle_id, work_order_id, status, issue_date, due_date, subtotal, vat_rate, vat_amount, total, paid_amount, paid_at, is_demo, created_at, updated_at)
  values (p_organization_id, num, c8, v10, wo6, 'paid', (now() - interval '33 days')::date, (now() - interval '18 days')::date, 150.00, 21.00, 31.50, 181.50, 181.50, now() - interval '30 days', true, now() - interval '33 days', now() - interval '30 days')
  returning id into inv2;
  insert into public.invoice_line_items (organization_id, invoice_id, description, kind, quantity, unit_price, sort_order)
  values
    (p_organization_id, inv2, 'Batterie 12V 70Ah', 'part', 1, 110.00, 0),
    (p_organization_id, inv2, 'Main d''oeuvre + diagnostic', 'labor', 1, 40.00, 1);
  insert into public.invoice_payments (organization_id, invoice_id, amount, paid_at)
  values (p_organization_id, inv2, 181.50, now() - interval '30 days');

  num := public.next_invoice_number(p_organization_id);
  insert into public.invoices (organization_id, invoice_number, customer_id, vehicle_id, status, issue_date, due_date, subtotal, vat_rate, vat_amount, total, paid_amount, is_demo, created_at, updated_at)
  values (p_organization_id, num, c6, v8, 'sent', (now() - interval '2 days')::date, (now() + interval '13 days')::date, 340.00, 21.00, 71.40, 411.40, 0, true, now() - interval '2 days', now() - interval '2 days')
  returning id into inv3;
  insert into public.invoice_line_items (organization_id, invoice_id, description, kind, quantity, unit_price, sort_order)
  values
    (p_organization_id, inv3, 'Revision generale (huile, filtres, controle 30 points)', 'labor', 1, 340.00, 0);

  num := public.next_invoice_number(p_organization_id);
  insert into public.invoices (organization_id, invoice_number, customer_id, vehicle_id, status, issue_date, due_date, subtotal, vat_rate, vat_amount, total, paid_amount, is_demo, created_at, updated_at)
  values (p_organization_id, num, c7, v9, 'overdue', (now() - interval '25 days')::date, (now() - interval '10 days')::date, 520.00, 21.00, 109.20, 629.20, 200.00, true, now() - interval '25 days', now() - interval '25 days')
  returning id into inv4;
  insert into public.invoice_line_items (organization_id, invoice_id, description, kind, quantity, unit_price, sort_order)
  values
    (p_organization_id, inv4, 'Disques + plaquettes de frein AV/AR', 'part', 1, 380.00, 0),
    (p_organization_id, inv4, 'Main d''oeuvre', 'labor', 2, 70.00, 1);
  insert into public.invoice_payments (organization_id, invoice_id, amount, paid_at)
  values (p_organization_id, inv4, 200.00, now() - interval '20 days');

  -- Parts / inventory ---------------------------------------------------------
  insert into public.parts (organization_id, name, sku, category, unit, quantity_on_hand, reorder_threshold, unit_cost, supplier_name, is_demo)
  values (p_organization_id, 'Plaquettes de frein avant', 'PF-AV-001', 'Freinage', 'set', 8, 3, 32.00, 'AutoParts BE', true) returning id into p1;
  insert into public.parts (organization_id, name, sku, category, unit, quantity_on_hand, reorder_threshold, unit_cost, supplier_name, is_demo)
  values (p_organization_id, 'Disques de frein avant', 'DF-AV-002', 'Freinage', 'pair', 4, 2, 68.00, 'AutoParts BE', true) returning id into p2;
  insert into public.parts (organization_id, name, sku, category, unit, quantity_on_hand, reorder_threshold, unit_cost, supplier_name, is_demo)
  values (p_organization_id, 'Filtre a huile', 'FH-010', 'Entretien', 'pcs', 15, 5, 8.50, 'Bosch Distribution', true) returning id into p3;
  insert into public.parts (organization_id, name, sku, category, unit, quantity_on_hand, reorder_threshold, unit_cost, supplier_name, is_demo)
  values (p_organization_id, 'Filtre a air', 'FA-011', 'Entretien', 'pcs', 12, 4, 14.00, 'Bosch Distribution', true) returning id into p4;
  insert into public.parts (organization_id, name, sku, category, unit, quantity_on_hand, reorder_threshold, unit_cost, supplier_name, is_demo)
  values (p_organization_id, 'Huile moteur 5W30 (5L)', 'HM-5W30', 'Entretien', 'bidon', 10, 4, 32.00, 'Total Energies', true) returning id into p5;
  insert into public.parts (organization_id, name, sku, category, unit, quantity_on_hand, reorder_threshold, unit_cost, supplier_name, is_demo)
  values (p_organization_id, 'Kit de distribution', 'KD-020', 'Moteur', 'set', 2, 2, 240.00, 'Gates', true) returning id into p6;
  insert into public.parts (organization_id, name, sku, category, unit, quantity_on_hand, reorder_threshold, unit_cost, supplier_name, is_demo)
  values (p_organization_id, 'Batterie 12V 70Ah', 'BAT-070', 'Electrique', 'pcs', 1, 3, 78.00, 'Varta', true) returning id into p7;
  insert into public.parts (organization_id, name, sku, category, unit, quantity_on_hand, reorder_threshold, unit_cost, supplier_name, is_demo)
  values (p_organization_id, 'Balais d''essuie-glace (paire)', 'BE-030', 'Carrosserie', 'pair', 6, 2, 12.00, 'Bosch Distribution', true) returning id into p8;

  insert into public.part_movements (organization_id, part_id, work_order_id, quantity, reason, note, created_at)
  values
    (p_organization_id, p6, wo5, -1, 'usage', 'Kit distribution monte sur BMW Serie 3', now() - interval '21 days'),
    (p_organization_id, p7, wo6, -1, 'usage', 'Batterie remplacee sur Opel Corsa', now() - interval '34 days'),
    (p_organization_id, p1, wo2, -1, 'usage', 'Plaquettes avant montees sur Renault Clio', now() - interval '1 day'),
    (p_organization_id, p3, null, 10, 'restock', 'Reappro fournisseur', now() - interval '15 days'),
    (p_organization_id, p1, null, 6, 'restock', 'Reappro fournisseur', now() - interval '10 days');
end;
$$;

revoke all on function public.seed_demo_data(uuid) from public, anon;
grant execute on function public.seed_demo_data(uuid) to authenticated;

-- delete_demo_data now also removes the conversation/message threads created
-- above — conversations has no is_demo column of its own, so this must run
-- (matched via lead_id) before the demo leads themselves are deleted below.
create or replace function public.delete_demo_data(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role(p_organization_id) not in ('owner', 'admin') then
    raise exception 'not authorized to delete demo data for organization %', p_organization_id;
  end if;

  delete from public.conversations
  where organization_id = p_organization_id
    and lead_id in (select id from public.leads where organization_id = p_organization_id and is_demo);
  -- messages cascade-delete with their conversation.

  delete from public.photo_diagnoses
  where organization_id = p_organization_id
    and (
      vehicle_id in (select id from public.vehicles where organization_id = p_organization_id and is_demo)
      or lead_id in (select id from public.leads where organization_id = p_organization_id and is_demo)
    );

  delete from public.vehicle_history_summaries
  where organization_id = p_organization_id
    and vehicle_id in (select id from public.vehicles where organization_id = p_organization_id and is_demo);

  delete from public.maintenance_suggestions
  where organization_id = p_organization_id
    and vehicle_id in (select id from public.vehicles where organization_id = p_organization_id and is_demo);

  delete from public.work_order_oversights
  where organization_id = p_organization_id
    and work_order_id in (select id from public.work_orders where organization_id = p_organization_id and is_demo);

  delete from public.invoice_payments
  where organization_id = p_organization_id
    and invoice_id in (select id from public.invoices where organization_id = p_organization_id and is_demo);

  delete from public.part_movements
  where organization_id = p_organization_id
    and (
      part_id in (select id from public.parts where organization_id = p_organization_id and is_demo)
      or work_order_id in (select id from public.work_orders where organization_id = p_organization_id and is_demo)
    );

  delete from public.invoices where organization_id = p_organization_id and is_demo;
  delete from public.quotes where organization_id = p_organization_id and is_demo;
  delete from public.work_orders where organization_id = p_organization_id and is_demo;
  delete from public.appointments where organization_id = p_organization_id and is_demo;
  delete from public.leads where organization_id = p_organization_id and is_demo;
  delete from public.parts where organization_id = p_organization_id and is_demo;
  delete from public.vehicles where organization_id = p_organization_id and is_demo;
  delete from public.customers where organization_id = p_organization_id and is_demo;
end;
$$;

revoke all on function public.delete_demo_data(uuid) from public, anon;
grant execute on function public.delete_demo_data(uuid) to authenticated;
