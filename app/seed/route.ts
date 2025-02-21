import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require', prepare: false });

// To drop all tables and reseed the database, avoid seed for multiple times
// curl -X GET http://localhost:3000/seed
async function dropTables() {
  console.log('Dropping all tables...');
  await sql`
    DROP TABLE IF EXISTS users, invoices, customers, revenue;
  `;
  console.log('All tables dropped');
}

async function seedUsers() {
  console.log('Seeding users...');
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;
  console.log('Users table created');

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const result = await sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
      console.log(`User inserted: ${user.email}`);
      return result;
    }),
  );

  console.log('Users seeded:', insertedUsers);
  return insertedUsers;
}

async function seedInvoices() {
  console.log('Seeding invoices...');
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;
  console.log('Invoices table created');

  const insertedInvoices = await Promise.all(
    invoices.map(
      async (invoice) => {
        const result = await sql`
          INSERT INTO invoices (customer_id, amount, status, date)
          VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
          ON CONFLICT (id) DO NOTHING;
        `;
        console.log(`Invoice inserted: ${invoice.amount} for customer ${invoice.customer_id}`);
        return result;
      },
    ),
  );

  console.log('Invoices seeded:', insertedInvoices);
  return insertedInvoices;
}

async function seedCustomers() {
  console.log('Seeding customers...');
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;
  console.log('Customers table created');

  const insertedCustomers = await Promise.all(
    customers.map(
      async (customer) => {
        const result = await sql`
          INSERT INTO customers (id, name, email, image_url)
          VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
          ON CONFLICT (id) DO NOTHING;
        `;
        console.log(`Customer inserted: ${customer.name}`);
        return result;
      },
    ),
  );

  console.log('Customers seeded:', insertedCustomers);
  return insertedCustomers;
}

async function seedRevenue() {
  console.log('Seeding revenue...');
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;
  console.log('Revenue table created');

  const insertedRevenue = await Promise.all(
    revenue.map(
      async (rev) => {
        const result = await sql`
          INSERT INTO revenue (month, revenue)
          VALUES (${rev.month}, ${rev.revenue})
          ON CONFLICT (month) DO NOTHING;
        `;
        console.log(`Revenue inserted for month: ${rev.month}`);
        return result;
      },
    ),
  );

  console.log('Revenue seeded:', insertedRevenue);
  return insertedRevenue;
}

export async function GET() {
  try {
    console.log('Starting database seeding...');
    await dropTables();
    const result = await sql.begin((sql) => [
      seedUsers(),
      seedCustomers(),
      seedInvoices(),
      seedRevenue(),
    ]);

    console.log('Database seeded successfully');
    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Error seeding database:', error);
    return Response.json({ error }, { status: 500 });
  }
}