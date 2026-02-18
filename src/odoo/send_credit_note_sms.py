# Node.js API URL
api_url = "https://your-server.com:3000/api/sms/send"



# Check if this is a credit note (Odoo-specific check)
if record.move_type in ['out_refund', 'in_refund']:  # Ensure we're handling credit notes
    # raise Userrror("Send Credit Note SMS: Executing Credit note sms")
    # Modified message template for credit notes
    # Check if the mobile number is available and not False/None
    mobile = record.partner_id.mobile or ""
    
    # Clean the mobile number by removing spaces (same as before)
    mobile = mobile.replace(" ", "") if mobile else ""
    
    # Prepare the product details for the message (same logic)
    product_details = ""
    for line in record.invoice_line_ids:
        product_details += f"{line.product_id.name} qty {line.quantity}, "
    
    # Trim the last comma and space
    product_details = product_details.strip(", ")
    
    
    message = f"""Dear {record.partner_id.name}, 
        Credit Note Amt: KES {record.amount_total}, 
        Adjusted Bal: KES {record.x_studio_cumulative_balance}, 
        Credit Savings: KES {record.amount_tax}, 
        Total Savings: KES {record.x_studio_cumulative_savings}.
        Ref: {record.name}. Big3Bakers"""
    
    # Prepare the request payload (same structure)
    payload = {
        "message": message,
        "mobile": mobile 
    }
    
    try:
        # Make the API request (same as before)
        response = requests.post(api_url, json=payload, headers={
            'X-API-Key': 'your-api-key-here'
        })
        response_data = response.json()
    
        # Handle the response (modified log messages)
        if response.status_code == 200 and response_data.get("success"):
            log_message = f"Credit Note SMS sent to {mobile} - Message: {message}"
            env['mail.message'].create({
                'message_type': 'notification',
                'body': log_message,
                'res_id': record.id,
                'model': record._name,
            })
            log(f"Credit Note SMS sent: {mobile}: {response_data.get('details')}", level="Credit SMS-SENDER success")
        else:
            error_message = response_data.get("error", "Unknown error occurred.")
            log(f"Credit Note SMS failed: {error_message}", level="Credit SMS-SENDER error")
    
    except requests.exceptions.RequestException as e:
        log(f"Credit Note SMS API Error: {str(e)}", level="Credit SMS-SENDER error")