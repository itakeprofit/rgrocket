#!/usr/bin/env python3
import argparse
import asyncio
import json
import os
import sys
from telethon import TelegramClient
from telethon.errors import PhoneCodeInvalidError, SessionPasswordNeededError, PhoneCodeExpiredError

async def authenticate(api_id, api_hash, phone, code, session_name):
    """
    Authenticate with Telegram using the provided code
    
    Args:
        api_id: Telegram API ID
        api_hash: Telegram API Hash
        phone: Phone number in international format
        code: Authentication code received via Telegram
        session_name: Name for the session file
        
    Returns:
        dict: Result indicating success or failure
    """
    try:
        # Create the client and connect
        client = TelegramClient(session_name, api_id, api_hash)
        await client.connect()
        
        # If already authorized, just return success
        if await client.is_user_authorized():
            await client.disconnect()
            return {"success": True, "message": "Already authenticated"}
        
        try:
            # Try to sign in with the code
            await client.sign_in(phone, code)
            
            # Check if successfully signed in
            if await client.is_user_authorized():
                await client.disconnect()
                return {"success": True, "message": "Authentication successful"}
            else:
                await client.disconnect()
                return {"success": False, "error": "Authentication failed for unknown reason"}
                
        except PhoneCodeInvalidError:
            await client.disconnect()
            return {"success": False, "error": "Invalid code provided"}
            
        except PhoneCodeExpiredError:
            await client.disconnect()
            return {"success": False, "error": "Code has expired, please request a new one"}
            
        except SessionPasswordNeededError:
            # This means the account has 2FA enabled
            # In a real app, you would need to handle this case by asking for the password
            await client.disconnect()
            return {"success": False, "error": "2FA is enabled, password required"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Authenticate with Telegram")
    parser.add_argument('--api-id', required=True, help='Telegram API ID')
    parser.add_argument('--api-hash', required=True, help='Telegram API Hash')
    parser.add_argument('--phone', required=True, help='Phone number in international format')
    parser.add_argument('--code', required=True, help='Authentication code')
    parser.add_argument('--session', required=True, help='Session name')
    
    args = parser.parse_args()
    
    # Run the authentication
    result = asyncio.run(authenticate(
        args.api_id, 
        args.api_hash,
        args.phone,
        args.code,
        args.session
    ))
    
    # Print the result as JSON
    print(json.dumps(result))

if __name__ == "__main__":
    main()