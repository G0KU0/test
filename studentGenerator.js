const { faker } = require('@faker-js/faker');

// Csak a legmegbízhatóbb egyetemet hagyjuk benne teszteléshez
// 532 = Arizona State University (Ez általában mindenhol működik)
const UNIVERSITIES = [
    { id: "532", name: "Arizona State University" }
];

function generateProfile() {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const uni = UNIVERSITIES[0]; // Mindig a biztosat választjuk
    
    // Születési dátum: 19 és 22 év között (egyetemistáknál ez a legbiztosabb)
    const birthDate = faker.date.birthdate({ min: 19, max: 22, mode: 'age' });
    const formattedDate = birthDate.toISOString().split('T')[0]; // YYYY-MM-DD

    return {
        firstName: firstName,
        lastName: lastName,
        email: faker.internet.email({ firstName, lastName, provider: 'gmail.com' }), 
        birthDate: formattedDate,
        organization: uni
    };
}

module.exports = { generateProfile };
