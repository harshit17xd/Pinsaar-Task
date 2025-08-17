require('dotenv').config();
const mongoose = require('mongoose');
const dayjs = require('dayjs');
const Note = require('../api/models/Note');

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await Note.deleteMany({});
    console.log('Cleared existing notes');

    // Create sample notes
    const sampleNotes = [
      {
        title: 'Welcome to DropLater',
        body: 'This is your first scheduled note. It will be delivered to the webhook at the specified time.',
        releaseAt: dayjs().add(1, 'minute').toDate(),
        webhookUrl: 'http://localhost:4000/sink',
        status: 'pending'
      },
      {
        title: 'Past Note - Should Deliver Soon',
        body: 'This note has a past release time and should be delivered immediately by the worker.',
        releaseAt: dayjs().subtract(1, 'minute').toDate(),
        webhookUrl: 'http://localhost:4000/sink',
        status: 'pending'
      },
      {
        title: 'Future Note',
        body: 'This note is scheduled for the future and will be delivered when the time comes.',
        releaseAt: dayjs().add(1, 'hour').toDate(),
        webhookUrl: 'http://localhost:4000/sink',
        status: 'pending'
      },
      {
        title: 'Already Delivered Note',
        body: 'This note has already been delivered successfully.',
        releaseAt: dayjs().subtract(10, 'minutes').toDate(),
        webhookUrl: 'http://localhost:4000/sink',
        status: 'delivered',
        deliveredAt: dayjs().subtract(5, 'minutes').toDate(),
        attempts: [
          {
            at: dayjs().subtract(5, 'minutes').toDate(),
            statusCode: 200,
            ok: true
          }
        ]
      },
      {
        title: 'Failed Note',
        body: 'This note failed to deliver and can be replayed.',
        releaseAt: dayjs().subtract(15, 'minutes').toDate(),
        webhookUrl: 'http://localhost:4000/sink',
        status: 'failed',
        attempts: [
          {
            at: dayjs().subtract(10, 'minutes').toDate(),
            statusCode: 500,
            ok: false,
            error: 'HTTP 500'
          }
        ]
      }
    ];

    // Insert sample notes
    const createdNotes = await Note.insertMany(sampleNotes);
    console.log(`Created ${createdNotes.length} sample notes`);

    // Display created notes
    console.log('\nSample notes created:');
    createdNotes.forEach(note => {
      console.log(`- ${note.title} (${note.status}) - ${dayjs(note.releaseAt).format('YYYY-MM-DD HH:mm:ss')}`);
    });

    console.log('\nSeed completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Start the services: docker-compose up');
    console.log('2. Access the admin UI: http://localhost:3000/admin');
    console.log('3. Test the API: curl -H "Authorization: Bearer your-token" http://localhost:3000/api/notes');

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
