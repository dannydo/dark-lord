
const https = require('https');

const API_KEY = 'FDC0D0A177694777A';
const BASE_URL = 'https://api.wingslashes.com';
const API_BASE_PATH = '/2/sheet/accountant/accountant/client-consultant/v3'; 
const STORES = ['2', '6', '16'];

async function getClientHistory(phone) {
    if (!phone) return null;
    
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) return null;

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const allBookings = [];

    for (const storeId of STORES) {
        try {
            const url = `${BASE_URL}${API_BASE_PATH}/${storeId}/${API_KEY}/${startDate}/${endDate}/BOOKED`;
            const csvData = await fetchUrl(url);
            
            const rows = parseCSV(csvData);
            const filterPhone = cleanPhone.slice(-9);

            const matches = rows.filter(row => {
                const rowPhone = (row['CLIENT PHONE'] || '').replace(/[^0-9]/g, '');
                return rowPhone.endsWith(filterPhone);
            });

            allBookings.push(...matches);
        } catch (err) {
            console.error(`Error fetching store ${storeId}:`, err);
        }
    }

    if (allBookings.length === 0) return null;

    allBookings.sort((a, b) => {
        const dateA = new Date(a['DATE BOOKED'] + ' ' + (a['TIME BOOKED'] || '00:00:00'));
        const dateB = new Date(b['DATE BOOKED'] + ' ' + (b['TIME BOOKED'] || '00:00:00'));
        return dateB - dateA;
    });

    const last = allBookings[0];

    return {
        client_name: last['CLIENT NAME'] || 'Unknown',
        last_service_name: last['SERVICE'] || 'Unknown',
        last_service_date: last['DATE BOOKED'],
        technician_name: last['CV'] || 'Unassigned',
        consultant_name: last['BOOKED BY'] || 'Unknown', 
        support_name: 'System', 
        store_name: mapStore(last['STORE']),
        total_bookings: allBookings.length,
        notes: last['NOTE'] || last['CLIENT TYPE'] || ''
    };
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
    });
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

function mapStore(id) {
    const stores = { '2': 'Phan Xích Long', '6': 'Đề Thám', '16': 'Estella Place' };
    return stores[id] || id;
}

module.exports = { getClientHistory };
