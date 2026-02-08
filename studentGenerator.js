const { faker } = require('@faker-js/faker');

// Népszerű US egyetemek listája a nagyobb siker érdekében
const UNIVERSITIES = [
    { id: "532", name: "Arizona State University" },
    { id: "667", name: "Ohio State University" },
    { id: "1098", name: "University of Florida" },
    { id: "982", name: "New York University" },
    { id: "1256", name: "University of Texas at Austin" }
];

function generateProfile() {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const uni = UNIVERSITIES[Math.floor(Math.random() * UNIVERSITIES.length)];
    
    // 18 és 24 év közötti születési dátum generálása
    const birthDate = faker.date.birthdate({ min: 18, max: 24, mode: 'age' });
    const formattedDate = birthDate.toISOString().split('T')[0]; // YYYY-MM-DD formátum

    return {
        firstName: firstName,
        lastName: lastName,
        // Gmail cím generálása, mert a SheerID ezt jobban szereti
        email: faker.internet.email({ firstName, lastName, provider: 'gmail.com' }), 
        birthDate: formattedDate,
        organization: uni
    };
}

module.exports = { generateProfile };
