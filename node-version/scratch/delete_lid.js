const { Contact } = require('../src/models/sql/models');
const { Op } = require('sequelize');

async function main() {
    try {
        console.log('Finding @lid contacts...');
        const count = await Contact.count({
            where: {
                phone_number: {
                    [Op.like]: '%@lid'
                }
            }
        });
        
        console.log(`Found ${count} @lid contacts. Deleting...`);
        
        if (count > 0) {
            await Contact.destroy({
                where: {
                    phone_number: {
                        [Op.like]: '%@lid'
                    }
                }
            });
            console.log('Successfully deleted @lid contacts.');
        } else {
            console.log('No @lid contacts found.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

main();
