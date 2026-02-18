# Node.js API URL
# raise UserError("Internal Server Error")
api_url = "https://your-server.com:3000/api/sms/send"

# Message and recipient phone number
# message = f"Dear {record.partner_id.name}, Sale Amt: KES {record.amount_total}, Cumulative Bal: KES {record.x_studio_cumulative_balance}, Sale savings:KES  {record.amount_tax}, Cumulative Savings: KES {record.x_studio_cumulative_savings}.Pay to TILL NO: 4649840 (NO CASH). Big3Bakers"
# Check if the mobile number is available and not False/None
mobile = record.partner_id.mobile or ""

# Clean the mobile number by removing spaces
mobile = mobile.replace(" ", "") if mobile else ""

# Prepare the product details for the message
product_details = ""
for line in record.invoice_line_ids:
    product_details += f"{line.product_id.name} qty {line.quantity}, "

# Trim the last comma and space
product_details = product_details.strip(", ")


message = f"Dear {record.partner_id.name}, Sale Amt: KES {record.amount_total}, Cumulative Bal: KES {record.x_studio_cumulative_balance}, Sale savings:KES {record.amount_tax}, Cumulative Savings: KES {record.x_studio_cumulative_savings}.Pay to TILL NO: 4649840 (NO CASH). Big3Bakers"


# Prepare the request payload
payload = {
    "message": message,
    "mobile": mobile 
}



try:
    # Make the API request
    response = requests.post(api_url, json=payload, timeout=10)
    response_data = response.json()
    
    # if mobile:
    #     raise UserError(f"Error: Could not find partner ID")

    # Handle the response
    if response.status_code == 200 and response_data.get("success"):
        # Log the successful response
        log_message = f"SMS sent successfully to {mobile} -  Message: {message}"
        env['mail.message'].create({
            'message_type': 'notification',
            'body': log_message,
            'res_id': record.id,
            'model': record._name,
        })
        log(f"SMS sent successfully to {mobile}: {response_data.get('details')}", level="SMS-SENDER success");
    else:
        # Handle failure and log the error
        error_message = response_data.get("error", "Unknown error occurred.")
        # raise UserError(f"Failed to send SMS: {error_message}")
        # raise UserError(f"Internal Server Error")
        log(f"Failed to send SMS: {error_message}", level="SMS-SENDER error");

except requests.exceptions.RequestException as e:
    # Handle network or API errors
    # raise UserError(f"Failed to connect to SMS API: {str(e)}")
    log(f"Failed to connect to SMS API: {str(e)}", level="SMS-SENDER error");
