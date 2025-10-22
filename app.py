"""
UNIQUE WORLD ROBOTICS - Multi-User Sales Tracker
Web-based application with Google Sheets backend (100% Free)
"""

from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import os
from typing import Optional

app = FastAPI(title="UWR Sales Tracker")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Google Sheets Configuration
SCOPES = [
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/drive'
]

# Global variable for worksheet
worksheet = None

def init_google_sheets():
    """Initialize Google Sheets connection"""
    global worksheet
    try:
        # Check if credentials file exists
        creds_file = os.getenv('GOOGLE_CREDENTIALS_FILE', 'credentials.json')
        
        if os.path.exists(creds_file):
            creds = ServiceAccountCredentials.from_json_keyfile_name(creds_file, SCOPES)
            client = gspread.authorize(creds)
            
            # Open the spreadsheet (you'll need to create this and share with service account)
            spreadsheet_key = os.getenv('SPREADSHEET_KEY', '')
            if spreadsheet_key:
                sheet = client.open_by_key(spreadsheet_key)
                worksheet = sheet.sheet1
                
                # Initialize headers if empty
                headers = worksheet.row_values(1)
                if not headers:
                    worksheet.append_row([
                        'Timestamp', 'Important', 'Institution', 'Contact Person', 
                        'Phone', 'Email', 'Status', 'Follow-up Date', 
                        'Requirements', 'Proposal Shared', 'Remarks', 'Added By'
                    ])
                return True
        return False
    except Exception as e:
        print(f"Google Sheets initialization error: {e}")
        return False

# Try to initialize Google Sheets on startup
sheets_available = init_google_sheets()

# Fallback: In-memory storage (for demo/testing without Google Sheets)
sales_data = []

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Main dashboard"""
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "sheets_available": sheets_available
    })

@app.get("/api/leads")
async def get_leads():
    """Get all leads"""
    if sheets_available and worksheet:
        try:
            # Get all records from Google Sheets
            all_records = worksheet.get_all_records()
            return {"success": True, "data": all_records, "source": "google_sheets"}
        except Exception as e:
            print(f"Error fetching from sheets: {e}")
            return {"success": False, "error": str(e), "data": sales_data, "source": "memory"}
    else:
        return {"success": True, "data": sales_data, "source": "memory"}

@app.post("/api/leads")
async def add_lead(
    institution: str = Form(...),
    contact_person: str = Form(...),
    phone: str = Form(...),
    email: str = Form(""),
    status: str = Form(...),
    followup_date: str = Form(""),
    requirements: str = Form(""),
    proposal_shared: str = Form(""),
    remarks: str = Form(""),
    added_by: str = Form("Team Member")
):
    """Add new lead"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    lead_data = {
        'Timestamp': timestamp,
        'Important': '',
        'Institution': institution,
        'Contact Person': contact_person,
        'Phone': phone,
        'Email': email,
        'Status': status,
        'Follow-up Date': followup_date,
        'Requirements': requirements,
        'Proposal Shared': proposal_shared,
        'Remarks': remarks,
        'Added By': added_by
    }
    
    if sheets_available and worksheet:
        try:
            # Add to Google Sheets
            worksheet.append_row([
                timestamp, '', institution, contact_person, phone, email,
                status, followup_date, requirements, proposal_shared, remarks, added_by
            ])
            return {"success": True, "message": "Lead added successfully!", "source": "google_sheets"}
        except Exception as e:
            print(f"Error adding to sheets: {e}")
            sales_data.append(lead_data)
            return {"success": True, "message": "Lead added to memory", "source": "memory"}
    else:
        sales_data.append(lead_data)
        return {"success": True, "message": "Lead added successfully!", "source": "memory"}

@app.post("/api/leads/{row_num}/toggle-star")
async def toggle_star(row_num: int):
    """Toggle important star for a lead"""
    if sheets_available and worksheet:
        try:
            # Row numbering: row 1 is headers, data starts at row 2
            # So row_num in API corresponds to row_num+1 in sheet
            actual_row = row_num + 1
            current_value = worksheet.cell(actual_row, 2).value  # Column B is Important
            new_value = '' if current_value == '⭐' else '⭐'
            worksheet.update_cell(actual_row, 2, new_value)
            return {"success": True, "message": "Star toggled"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    else:
        if 0 <= row_num - 1 < len(sales_data):
            current = sales_data[row_num - 1].get('Important', '')
            sales_data[row_num - 1]['Important'] = '' if current == '⭐' else '⭐'
            return {"success": True, "message": "Star toggled"}
        return {"success": False, "error": "Invalid row number"}

@app.delete("/api/leads/{row_num}")
async def delete_lead(row_num: int):
    """Delete a lead"""
    if sheets_available and worksheet:
        try:
            # Row numbering: row 1 is headers, data starts at row 2
            actual_row = row_num + 1
            worksheet.delete_rows(actual_row)
            return {"success": True, "message": "Lead deleted"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    else:
        if 0 <= row_num - 1 < len(sales_data):
            sales_data.pop(row_num - 1)
            return {"success": True, "message": "Lead deleted"}
        return {"success": False, "error": "Invalid row number"}

@app.get("/api/stats")
async def get_stats():
    """Get statistics"""
    if sheets_available and worksheet:
        try:
            all_records = worksheet.get_all_records()
            total_calls = len(all_records)
            active_statuses = ["New Lead", "Contacted", "Interested", "Proposal Sent", "Negotiating"]
            active_leads = sum(1 for record in all_records if record.get('Status') in active_statuses)
            important_leads = sum(1 for record in all_records if record.get('Important') == '⭐')
            
            return {
                "total_calls": total_calls,
                "active_leads": active_leads,
                "important_leads": important_leads
            }
        except:
            pass
    
    total_calls = len(sales_data)
    active_statuses = ["New Lead", "Contacted", "Interested", "Proposal Sent", "Negotiating"]
    active_leads = sum(1 for lead in sales_data if lead.get('Status') in active_statuses)
    important_leads = sum(1 for lead in sales_data if lead.get('Important') == '⭐')
    
    return {
        "total_calls": total_calls,
        "active_leads": active_leads,
        "important_leads": important_leads
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "google_sheets": sheets_available,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

