#!/usr/bin/env python3
"""
Telegram account checker script
This script checks if phone numbers have Telegram accounts
"""
import argparse
import asyncio
import json
import os
import sys
from telethon import TelegramClient
from telethon.errors import FloodWaitError, PhoneNumberInvalidError

async def check_account(client, phone_number):
    """
    Check if a phone number has a Telegram account and return user info.
    
    Args:
        client: Telegram client instance
        phone_number: Phone number to check in international format
    
    Returns:
        dict: Result with account info or None if not found
    """
    try:
        # Use the imported contact functionality
        result = await client.get_entity(phone_number)
        
        # If we get here, the number has a Telegram account
        return {
            "phoneNumber": phone_number,
            "found": True,
            "telegramId": str(result.id),
            "username": result.username,
            "name": f"{getattr(result, 'first_name', '')} {getattr(result, 'last_name', '')}".strip()
        }
    except PhoneNumberInvalidError:
        return {
            "phoneNumber": phone_number,
            "found": False,
            "error": "Invalid phone number format"
        }
    except ValueError:
        # If not found, return negative result
        return {
            "phoneNumber": phone_number,
            "found": False
        }
    except FloodWaitError as e:
        # We need to wait this many seconds before continuing
        return {
            "phoneNumber": phone_number,
            "found": False,
            "error": f"Rate limit exceeded. Need to wait {e.seconds} seconds."
        }
    except Exception as e:
        return {
            "phoneNumber": phone_number,
            "found": False,
            "error": str(e)
        }

async def process_batch(api_id, api_hash, phone, phone_numbers, timeout=30):
    """
    Process a batch of phone numbers to check Telegram accounts.
    
    Args:
        api_id: Telegram API ID
        api_hash: Telegram API Hash
        phone: Phone number for the Telegram account
        phone_numbers: List of phone numbers to check
        timeout: Timeout in seconds for operations
    
    Returns:
        list: Results for each phone number
    """
    try:
        # Session name is based on the user's phone
        session_name = f"checker_{phone.replace('+', '')}"
        
        # Create the client
        client = TelegramClient(session_name, api_id, api_hash)
        await client.connect()
        
        # Check if already authorized, if not we can't proceed
        if not await client.is_user_authorized():
            return [{
                "phoneNumber": num,
                "found": False,
                "error": "Client not authenticated. Please complete authentication first."
            } for num in phone_numbers]
        
        results = []
        
        # Process each phone number with delay to avoid rate limits
        for number in phone_numbers:
            result = await check_account(client, number)
            results.append(result)
            
            # Small delay to avoid hitting rate limits
            await asyncio.sleep(0.5)
        
        # Disconnect when done
        await client.disconnect()
        return results
        
    except Exception as e:
        return [{
            "phoneNumber": num,
            "found": False,
            "error": str(e)
        } for num in phone_numbers]

def main():
    """Main function to parse arguments and call processing function"""
    parser = argparse.ArgumentParser(description='Check Telegram accounts for phone numbers')
    parser.add_argument('--api-id', required=True, help='Telegram API ID')
    parser.add_argument('--api-hash', required=True, help='Telegram API Hash')
    parser.add_argument('--phone', required=True, help='Phone number in international format')
    parser.add_argument('--input-file', required=True, help='JSON file with phone numbers array')
    parser.add_argument('--timeout', type=int, default=30, help='Operation timeout in seconds')
    
    args = parser.parse_args()
    
    # Load phone numbers from file
    try:
        with open(args.input_file, 'r') as f:
            phone_numbers = json.load(f)
            if not isinstance(phone_numbers, list):
                print(json.dumps([{
                    "phoneNumber": "error",
                    "found": False,
                    "error": "Input file must contain a JSON array of phone numbers"
                }]))
                sys.exit(1)
    except Exception as e:
        print(json.dumps([{
            "phoneNumber": "error",
            "found": False,
            "error": f"Error loading input file: {str(e)}"
        }]))
        sys.exit(1)
    
    # Process the numbers
    results = asyncio.run(process_batch(
        args.api_id, 
        args.api_hash,
        args.phone,
        phone_numbers,
        args.timeout
    ))
    
    # Print results as JSON
    print(json.dumps(results))

if __name__ == "__main__":
    main()