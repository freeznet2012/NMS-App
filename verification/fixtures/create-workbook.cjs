const XLSX = require('xlsx');
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Code','Name','Monthly price (₹)'],['MM','Malayala Manorama',300],['MB','Mathrubhumi',300]]),'Periodicals');
const rows = [['Household','Route','Delivery boy','Phone','Periodicals','2026-05 pending (₹)']];
for(let i=0;i<42;i++) rows.push([i===0?'Anu':i===1?'Anu Canal':`Sample household ${i+1}`,'Temple Road',i<21?'Binu':'Manu','',i<14?'MM, MB':'MM',i===0?200:i===1?2200:'']);
XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'Customers');
XLSX.writeFile(book,'verification/fixtures/temple-road.xlsx');
