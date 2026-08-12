function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var today = new Date();
    var sheetName = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Add the header row to match your existing code
      sheet.appendRow([
        "Date", 
        "Name", 
        "Branch", 
        "Roll Number", 
        "Phone Number", 
        "Role", 
        "Purpose / Notes", 
        "Check-In Time", 
        "Check-Out Time", 
        "Verification Method"
      ]);
      
      // Freeze the first row and make the text bold
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold");
    }

    var data;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'No data received.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Parse Timestamp into Date and Time
    var ts = data.timestamp || new Date().toLocaleString();
    var tsParts = ts.split(',');
    var dateString = tsParts[0].trim();
    var timeString = tsParts.length > 1 ? tsParts[1].trim() : ts;

    if (data.action === 'CHECK-OUT') {
      
      // If it's a manual check-out, we always append a new row because it's a retroactive session
      if (data.manualCheckInTime) {
        var rowManual = [
          dateString, data.name || '', data.branch || '', data.rollNumber || '', data.phone || '', data.role || '', data.purpose || '', data.manualCheckInTime, timeString, data.verificationMethod || ''
        ];
        sheet.appendRow(rowManual);
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'success', message: 'Manual Check-Out logged successfully.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var foundRowIndex = -1;

      // Start from bottom to find the most recent row for this user
      for (var i = values.length - 1; i > 0; i--) {
        var rowName = values[i][1] || '';   // Col B: Name
        var rowRoll = values[i][3] || '';   // Col D: Roll Number
        var rowPhone = values[i][4] || '';  // Col E: Phone Number

        var isMatch = false;
        if (data.rollNumber && rowRoll.toString().toLowerCase() === data.rollNumber.toString().toLowerCase()) {
          isMatch = true;
        } else if (data.phone && rowPhone.toString() === data.phone.toString()) {
          isMatch = true;
        } else if (data.name && rowName.toString().toLowerCase() === data.name.toString().toLowerCase()) {
          isMatch = true;
        }

        if (isMatch) {
          foundRowIndex = i + 1; // 1-based index for getRange
          break;
        }
      }

      if (foundRowIndex !== -1) {
        // Update Check-Out Time (Col I, which is index 9)
        sheet.getRange(foundRowIndex, 9).setValue(timeString);
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'success', message: 'Check-Out logged successfully.' }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        // If no prior check-in found, append a new row with Check-In left blank
        var rowOut = [
          dateString, data.name || '', data.branch || '', data.rollNumber || '', data.phone || '', data.role || '', data.purpose || '', "", timeString, data.verificationMethod || ''
        ];
        sheet.appendRow(rowOut);
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'success', message: 'Check-Out logged (No previous Check-In found).' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

    } else {
      // CHECK-IN
      var rowIn = [
        dateString, data.name || '', data.branch || '', data.rollNumber || '', data.phone || '', data.role || '', data.purpose || '', timeString, "", data.verificationMethod || ''
      ];
      sheet.appendRow(rowIn);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Check-In logged successfully.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Sreenidhi Ascend Attendance API is live.',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/*
function doPost(e) {
  try {
    // 1. Parse the incoming JSON payload from your website
    var data = JSON.parse(e.postData.contents);
    
    // 2. Open the spreadsheet where this script is attached
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 3. Get today's date formatted as YYYY-MM-DD to use as the sheet name
    var today = new Date();
    var sheetName = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    // 4. Try to get the sheet for today
    var sheet = ss.getSheetByName(sheetName);
    
    // 5. If it doesn't exist, create it and add headers!
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Add the header row
      sheet.appendRow([
        "Timestamp", 
        "Action", 
        "Name", 
        "Branch", 
        "Roll Number", 
        "Phone", 
        "Role", 
        "Purpose", 
        "Verification Method", 
        "Manual Check-In Time"
      ]);
      
      // Optional: Freeze the first row and make the text bold so it looks nice
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold");
    }
    
    // 6. Append the incoming attendance data to today's sheet
    sheet.appendRow([
      data.timestamp || "",
      data.action || "",
      data.name || "",
      data.branch || "",
      data.rollNumber || "",
      data.phone || "",
      data.role || "",
      data.purpose || "",
      data.verificationMethod || "",
      data.manualCheckInTime || ""
    ]);
    
    // 7. Return a success response to the website
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    // Return an error response if something goes wrong
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

*/
