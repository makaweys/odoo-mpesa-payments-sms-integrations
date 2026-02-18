mobile_number = record.mobile

# raise UserError("Updating mobile hash")

if mobile_number:
    # Define the API URL
    api_url = "https://your-server.com:3000/api/hash/generate"

    # Prepare the payload
    payload = {
        'customer_id': record.id,  # Assuming the record's ID is used as customer_id
        'mobile_number': mobile_number,
    }

    # Send the POST request to the API
    response = requests.post(api_url, json=payload, headers={
    'X-API-Key': 'your-api-key-here'
})

    # Check if the response is successful
    if response.status_code == 200:
        # Parse the JSON response
        response_data = response.json()
        
        
        # Extract the hashes from the response
        mobile_hash_plus254 = response_data.get('mobile_hash_plus254')
        mobile_hash_07 = response_data.get('mobile_hash_07')
        mobile_hash_254 = response_data.get('mobile_hash_254')
        
        log(f"Hashes: {mobile_number} - {mobile_hash_plus254} - {mobile_hash_07} - {mobile_hash_254}", level="Mobile Hash info");
        
        record['x_studio_mobile_hash_plus254'] = mobile_hash_plus254
        record['x_studio_mobile_hash_07'] = mobile_hash_07
        record['x_studio_mobile_hash_254'] = mobile_hash_254

        # Save the hashes back to the record
        # record.hashed_mobile_number = mobile_hash_plus254  # Or whichever you prefer
        # You can also save the other hashes if needed
    else:
        # Handle the case where the API call fails
        raise UserError("Failed to generate hashes: {}".format(response.text))
