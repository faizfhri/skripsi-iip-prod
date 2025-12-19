// ===== GOOGLE APPS SCRIPT FOR SURVEY =====
// Deploy ini sebagai Web App di Google Apps Script

// KONFIGURASI
const SPREADSHEET_ID = '1cvmb7n3kdAH8oqroGgNNGjma4CX5H-tZTsHuh3Y_mjY'; // Ganti dengan ID Google Sheets kamu
const SHEET_NAME = 'Responses'; // Nama sheet untuk data responses
const TRACKING_SHEET_NAME = 'Tracking'; // Nama sheet untuk tracking assignment

// ===== MAIN FUNCTIONS =====

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getAssignment') {
    const strata = e.parameter.strata;
    return getGroupAssignment(strata);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Invalid action'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    saveToSheet(data);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== STRATIFIED RANDOM ASSIGNMENT =====

function getGroupAssignment(strata) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let trackingSheet = ss.getSheetByName(TRACKING_SHEET_NAME);
    
    // Buat tracking sheet jika belum ada
    if (!trackingSheet) {
      trackingSheet = createTrackingSheet(ss);
    }
    
    // Get current counts untuk strata ini
    const data = trackingSheet.getDataRange().getValues();
    let strataRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === strata) {
        strataRow = i;
        break;
      }
    }
    
    // Jika strata belum ada, buat baris baru
    if (strataRow === -1) {
      trackingSheet.appendRow([strata, 0, 0, 0]);
      strataRow = trackingSheet.getLastRow() - 1;
    }
    
    // Get counts untuk A, B, C
    const countA = trackingSheet.getRange(strataRow + 1, 2).getValue();
    const countB = trackingSheet.getRange(strataRow + 1, 3).getValue();
    const countC = trackingSheet.getRange(strataRow + 1, 4).getValue();
    
    // Assign ke group dengan count paling sedikit
    let assignedGroup;
    let updateColumn;
    
    const minCount = Math.min(countA, countB, countC);
    
    if (countA === minCount && countB === minCount && countC === minCount) {
      // Semua sama, random
      const groups = ['A', 'B', 'C'];
      assignedGroup = groups[Math.floor(Math.random() * 3)];
    } else if (countA === minCount) {
      assignedGroup = 'A';
    } else if (countB === minCount) {
      assignedGroup = 'B';
    } else {
      assignedGroup = 'C';
    }
    
    // Update count
    if (assignedGroup === 'A') updateColumn = 2;
    else if (assignedGroup === 'B') updateColumn = 3;
    else updateColumn = 4;
    
    const currentCount = trackingSheet.getRange(strataRow + 1, updateColumn).getValue();
    trackingSheet.getRange(strataRow + 1, updateColumn).setValue(currentCount + 1);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      group: assignedGroup,
      strata: strata,
      counts: {
        A: assignedGroup === 'A' ? countA + 1 : countA,
        B: assignedGroup === 'B' ? countB + 1 : countB,
        C: assignedGroup === 'C' ? countC + 1 : countC
      }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== SAVE DATA TO SHEETS =====

function saveToSheet(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  // Buat sheet jika belum ada
  if (!sheet) {
    sheet = createResponseSheet(ss);
  }
  
  // Ambil headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Buat row data sesuai urutan headers
  const row = headers.map(header => {
    return data[header] || '';
  });
  
  // Append data
  sheet.appendRow(row);
  
  // Format timestamp
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 1).setNumberFormat('dd/mm/yyyy hh:mm:ss');
}

// ===== INITIALIZE SHEETS =====

function createResponseSheet(ss) {
  const sheet = ss.insertSheet(SHEET_NAME);
  
  // Set headers - updated for new structure with phone, ewallet, and response fields
  const headers = [
    'timestamp',
    'nama',
    'email',
    'usia',
    'jenis_kelamin',
    'nomor_telepon',
    'tujuan_ewallet',
    'pengalaman_marketing',
    'aktif_media_digital',
    'pernah_lihat_iklan_digital',
    'frekuensi_lihat_iklan_digital',
    'pernah_lihat_iklan_donasi',
    'frekuensi_lihat_iklan_donasi',
    'pernah_beli_produk_donasi',
    'jenis_produk_donasi',
    'strata',
    'kelompok_stimulus',
    'scale1_tidak_pernah_pasti_berniat',
    'scale2_jelas_tidak_jelas_berniat',
    'scale3_minat_sangat_rendah_tinggi',
    'scale4_jelas_tidak_jelas_akan_beli',
    'scale5_mungkin_tidak_mungkin_beli',
    'response1_tersentuh',
    'response2_manfaat'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#4A90E2')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  return sheet;
}

function createTrackingSheet(ss) {
  const sheet = ss.insertSheet(TRACKING_SHEET_NAME);
  
  // Set headers
  const headers = ['Strata', 'Group_A', 'Group_B', 'Group_C'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#28A745')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Set column widths
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
  
  // Add initial strata rows - updated to Ya/Tidak
  const strata = [
    'L-Tidak',
    'L-Ya',
    'P-Tidak',
    'P-Ya'
  ];
  
  strata.forEach(s => {
    sheet.appendRow([s, 0, 0, 0]);
  });
  
  return sheet;
}

// ===== UTILITY FUNCTIONS =====

function getGroupDistribution() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const trackingSheet = ss.getSheetByName(TRACKING_SHEET_NAME);
  
  if (!trackingSheet) {
    return null;
  }
  
  const data = trackingSheet.getDataRange().getValues();
  const distribution = {};
  
  for (let i = 1; i < data.length; i++) {
    distribution[data[i][0]] = {
      A: data[i][1],
      B: data[i][2],
      C: data[i][3]
    };
  }
  
  return distribution;
}

function getSummaryStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const responseSheet = ss.getSheetByName(SHEET_NAME);
  
  if (!responseSheet) {
    return {
      totalResponses: 0,
      byGroup: { A: 0, B: 0, C: 0 },
      byStrata: {}
    };
  }
  
  const data = responseSheet.getDataRange().getValues();
  const headers = data[0];
  const groupCol = headers.indexOf('kelompok_stimulus');
  const strataCol = headers.indexOf('strata');
  
  let stats = {
    totalResponses: data.length - 1,
    byGroup: { A: 0, B: 0, C: 0 },
    byStrata: {}
  };
  
  for (let i = 1; i < data.length; i++) {
    const group = data[i][groupCol];
    const strata = data[i][strataCol];
    
    stats.byGroup[group]++;
    
    if (!stats.byStrata[strata]) {
      stats.byStrata[strata] = { A: 0, B: 0, C: 0 };
    }
    stats.byStrata[strata][group]++;
  }
  
  return stats;
}

// ===== MANUAL TESTING FUNCTIONS =====

function testGetAssignment() {
  const result = getGroupAssignment('L-Ya');
  Logger.log(result.getContent());
}

function testSaveData() {
  const testData = {
    timestamp: new Date().toISOString(),
    nama: 'Test User',
    email: 'test@example.com',
    usia: '25',
    jenis_kelamin: 'Laki-laki',
    pengalaman_marketing: 'Tidak',
    aktif_media_digital: 'Ya',
    pernah_lihat_iklan_digital: 'Ya',
    frekuensi_lihat_iklan_digital: '6–10',
    pernah_lihat_iklan_donasi: 'Ya',
    frekuensi_lihat_iklan_donasi: '0–5',
    pernah_beli_produk_donasi: 'Ya',
    jenis_produk_donasi: 'Produk skincare',
    strata: 'L-Ya',
    kelompok_stimulus: 'A',
    scale1_tidak_pernah_pasti_berniat: '5',
    scale2_jelas_tidak_jelas_berniat: '6',
    scale3_minat_sangat_rendah_tinggi: '5',
    scale4_jelas_tidak_jelas_akan_beli: '6',
    scale5_mungkin_tidak_mungkin_beli: '5'
  };
  
  saveToSheet(testData);
  Logger.log('Test data saved!');
}

function showStats() {
  const stats = getSummaryStats();
  Logger.log(JSON.stringify(stats, null, 2));
}
