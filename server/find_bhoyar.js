const mongoose = require('mongoose');
const Mechanic = require('./models/Mechanic');
require('dotenv').config();

const findMechanic = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mechanic_portal');
        console.log('Connected to DB');
        
        const mechanics = await Mechanic.find({});
        console.log('Total mechanics found:', mechanics.length);
        
        const bhoyar = mechanics.find(m => 
            m.name.toLowerCase().includes('bhoyar') || 
            m.shopName.toLowerCase().includes('bhoyar') ||
            m.email.toLowerCase().includes('bhoyar')
        );
        
        if (bhoyar) {
            console.log('Mechanic found:');
            console.log(JSON.stringify(bhoyar, null, 2));
        } else {
            console.log('No mechanic found with "bhoyar" in name, shop name, or email.');
            console.log('Listing all mechanics names/emails:');
            mechanics.forEach(m => console.log(`- ${m.name} (${m.email})`));
        }
        
        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

findMechanic();
