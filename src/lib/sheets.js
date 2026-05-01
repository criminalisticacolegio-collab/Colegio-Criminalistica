/**
 * Sheets API Service
 * 
 * This service handles communication with Google Sheets via a Google Apps Script Web App.
 * Currently using mock data until a valid Apps Script URL is provided.
 */

const GAS_WEBAPP_URL = ''; // Replace with real URL when available

/**
 * Fetch data from Google Sheets
 * @param {string} tabName - The name of the sheet tab (e.g., 'Padron', 'Aranceles')
 * @returns {Promise<Array>}
 */
export async function getSheetsData(tabName) {
    if (!GAS_WEBAPP_URL) {
        console.warn('GAS_WEBAPP_URL not set. Returning mock data.');
        return getMockData(tabName);
    }

    try {
        const response = await fetch(`${GAS_WEBAPP_URL}?tab=${tabName}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data for ${tabName}:`, error);
        return getMockData(tabName);
    }
}

/**
 * Mock data for development
 */
function getMockData(tabName) {
    const mocks = {
        'Padron': [
            { id: 1, nombre: 'Juan Pérez', matricula: 'MP-001', especialidad: 'Balística' },
            { id: 2, nombre: 'María García', matricula: 'MP-002', especialidad: 'Documentología' },
            { id: 3, nombre: 'Carlos Rodríguez', matricula: 'MP-003', especialidad: 'Papiloscopía' }
        ],
        'Aranceles': [
            { id: 1, concepto: 'Cuota Mensual', valor: '$5000' },
            { id: 2, concepto: 'Inscripción Matricula', valor: '$15000' }
        ],
        'Leyes': [
            { id: 1, titulo: 'Ley 1234 - Ejercicio Profesional', link: '#' },
            { id: 2, titulo: 'Estatuto del Colegio', link: '#' }
        ]
    };

    return mocks[tabName] || [];
}
