# Raise error if no payload data is found
if not payload.get('TransID'):
    log(f"Confirmation: Transaction ID Not Found: {payload}", level="Mpesa Conf v2 Error")
else:
    # Log the incoming data for debugging
    # log(f"Confirmation: Received data (Payload): {payload}", level="Mpesa Conf v2 Info")
    # Extract necessary fields from the payload
    transaction_reference = payload.get('TransID')
    transaction_amount = payload.get('TransAmount')
    trans_time_str = payload.get('TransTime')
    customer_reference = payload.get('BillRefNumber')
    msisdn = payload.get('MSISDN')
    hashed_msisdn = payload.get('MSISDN')
    first_name = payload.get('FirstName')
    middle_name = payload.get('MiddleName')
    last_name = payload.get('LastName')
    
    # Process transaction time (format to YYYY-MM-DD HH:MM:SS)
    if trans_time_str:
        trans_time = f"{trans_time_str[:4]}-{trans_time_str[4:6]}-{trans_time_str[6:8]} {trans_time_str[8:10]}:{trans_time_str[10:12]}:{trans_time_str[12:]}"
    else:
        trans_time = False
   
    
    # Debug the incoming transaction data
    log(f"Confirmation: Transaction Reference: {transaction_reference}, MSISSDN: {hashed_msisdn}, Amount: {transaction_amount}, Time: {trans_time}, Customer: {first_name} {middle_name} {last_name}" , level="Mpesa Conf v2 Info")
    
    
    partner = env['res.partner'].search([
        ('customer_rank', '>', 0),  # This ensures the partner is a customer
        '|', '|',
        ('x_studio_mobile_hash_plus254', '=', hashed_msisdn),
        ('x_studio_mobile_hash_07', '=', hashed_msisdn),
        ('x_studio_mobile_hash_254', '=', hashed_msisdn)
    ], limit=1)
    
    partnerId = False
    pmobile_number = False
    # Raise an error or log the found partner for debugging
    if not partner:
        partnerId = False;
        log(f"Confirmation: Did not find partner", level="Mpesa Conf v2 Info")
    else:
        partnerId = partner.id
        pmobile_number = partner.mobile
        log(f"Confirmation: Found partner: {partner.name} (ID: {partner.id})", level="Mpesa Conf v2 Info")
    
    existing_payment = False
    
    try:
        # Check if a payment with the same transaction reference already exists
        existing_payment = env['account.payment'].search([
            '|',
            ('name', '=', transaction_reference),
            ('memo', '=', transaction_reference)
        ], limit=1)
    
    except requests.exceptions.RequestException as e:
        log(f"Failed to check payment: {str(e)}", level="Mpesa Conf v2 error");
    

    
    if existing_payment:
        # Log if a payment already exists
        log(f"Confirmation: Payment with transaction reference {transaction_reference} already exists: {existing_payment.id}", level="Mpesa Conf v2 Error")
    else:
        
        
        payment_method = env['account.payment.method.line'].search([('name', 'ilike', 'mpesa')],limit=1)
        journal = env['account.journal'].search([('name', '=', 'Mpesa Payments')], limit=1)
        
        # raise UserError(payment_method)
        
        # Raise an error or log the found method
        if not payment_method:
            payment_method_id = False;
        else:
            payment_method_id = payment_method.id
            # log(f"Confirmation: Found method: {payment_method.name} (ID: {payment_method.id})", level="Mpesa Conf v2 Error")
            
        # Raise an error or log the found method
        if not journal:
            journalId = False;
        else:
            journalId = journal.id
            # log(f"Confirmation: Found journal: {journal.name} (ID: {journal.id})", level="Mpesa Conf v2 Error")
        # Create a payment record if no existing payment is found
        payment_vals = {
            'partner_id': partnerId,
            'amount': float(transaction_amount),
            'currency_id': env['res.currency'].search([('name', '=', 'KES')], limit=1).id,  # Assuming KES (Kenyan Shilling) as the currency
            'payment_type': 'inbound',
            'payment_method_id': env.ref('account.account_payment_method_manual_in').id,
            'x_studio_payment_reconciliation_method': "Automatic",
            'x_studio_mpesa_phone_no':pmobile_number,
            'partner_type': 'customer',
            'journal_id': journalId,
            'memo': transaction_reference,  # Using transaction reference as payment name
            'date': trans_time,  # Use trans_time or today's date
            'x_studio_transaction_datetime': trans_time  # Use trans_time or today's date
        }
        
        payment_vals_backup = {
            'x_studio_partner_id': partnerId,
            'x_studio_amount': float(transaction_amount),
            'x_studio_currency_id': env['res.currency'].search([('name', '=', 'KES')], limit=1).id,  # Assuming KES (Kenyan Shilling) as the currency
            'x_studio_payment_type': 'inbound',
            # 'x_studio_payment_method_id': env.ref('account.account_payment_method_manual_in').id,
            'x_studio_payment_reconciliation_method': "Automatic",
            'x_studio_mpesa_phone_no':pmobile_number,
            'x_studio_partner_type': 'customer',
            'x_studio_journal_id': journalId,
            'x_studio_ref': transaction_reference,  # Using transaction reference as payment name
            'x_studio_date': trans_time,  # Use trans_time or today's date
            'x_studio_date_time': trans_time,
            'x_name': transaction_reference
        }
    
        # Log payment values before creation
        # log(f"Payment Values: {payment_vals}", level="Mpesa Error")
        
    
        try:
            payment_backup = env['x_mpesa_transactions_b'].create(payment_vals_backup)
            payment = env['account.payment'].create(payment_vals)
            
            if partnerId:
                payment.action_post()
                
            result = {
                'transactionID': transaction_reference,
                'statusCode': 0,  # Success
                'statusMessage': 'Notification received'
            }
            
            
            #-------------------------------- Payment Confirmation
            if pmobile_number:
                api_url = "https://apps.bigthreebakers.co.ke/sms-api/send-sms"
                mobile = pmobile_number
                mobile = mobile.replace(" ", "") if mobile else ""
                
                invoices = env['account.move'].search([
                        ('partner_id', '=', partnerId),
                        ('state', '=', 'posted'),
                        ('move_type', '=', 'out_invoice')
                    ])
                # Retrieve only customer credit notes (refunds)
                credits = env['account.move'].search([
                    ('partner_id', '=', partnerId),
                    ('state', '=', 'posted'),
                    ('move_type', '=', 'out_refund')
                ])
                # Retrieve all inbound payments related to the customer
                payments = env['account.payment'].search([
                    ('partner_id', '=', partnerId),
                    ("state", "in", ["in_process", "paid"]),
                    ('payment_type', '=', 'inbound')  
                ])
                
                debtors_account = env['account.account'].search([('code', '=', '110000')], limit=1)
                total_redemption = 0.0
                if debtors_account:
                    redemption_lines = env['account.move.line'].search([
                        ('partner_id', '=', partnerId),
                        ('account_id', '=', debtors_account.id),
                        ('parent_state', '=', 'posted'),
                        ('journal_id.id', 'not in', [9, 14, 19, 17, 22]), #Do not include, invoice ledger, credits, customer deposits, Mpesa/KCB Payments
                        ('move_id.move_type', '=', 'entry'),  # Exclude invoices/refunds
                        ('credit', '>', 0)
                    ])
                    total_redemption = sum(redemption_lines.mapped('credit'))
                
                # Calculate the total invoice, credit, payment amounts
                total_payments_amount = sum(payments.mapped('amount'))
                total_invoices_amount = sum(invoices.mapped('amount_total'))
                total_credits_amount = sum(credits.mapped('amount_total'))
                
                cumulative_balance = total_invoices_amount - total_credits_amount - total_payments_amount - total_redemption
                
                formatted_balance = round(cumulative_balance, 2)
                
                message = f"Dear {partner.name}, KES {transaction_amount} to Big Three Bakers received. Your Bal is: KES {formatted_balance}. Pay to TILL NO: 4649840 (NO CASH)"
                payload = {
                    "message": message,
                    "mobile": mobile 
                }
                
                try:
                    # Make the API request
                    response = requests.post(api_url, json=payload, timeout=10)
                    response_data = response.json()
                
                    # Handle the response
                    if response.status_code == 200 and response_data.get("success"):
                        log(f"Payment confirmation SMS sent successfully to {partner.name}", level="Mpesa Conf v2 SMS-SENDER success");
                    else:
                        error_message = response_data.get("error", "Unknown error occurred.")
                        log(f"Failed to send payment confirmation sms: {error_message}", level="Mpesa Conf v2 SMS-SENDER error");
                
                # except requests.exceptions.RequestException as e:
                #   log(f"Failed to send payment confirmation SMS: {str(e)}", level="Mpesa Conf v2 SMS-SENDER error");
                
                except Exception as e:
                    log(f"Failed to send payment confirmation SMS: {str(e)}", level="Mpesa Conf v2 SMS-SENDER error")
            
            #-------------------------------- Payment Confirmation          
            log(f"Confirmation: Payment processing result: {result}",level="Mpesa Conf v2 Success")
            
        except Exception as e:
            log(f"Confirmation: Error creating or posting payment: {e}", level="Mpesa Conf v2 Error")
            # raise UserError(f"Error creating or posting payment: {e}")

