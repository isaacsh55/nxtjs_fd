'use server'; // mark all the exported functions as server-side functions

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation'; 

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// For initialize the type validation of data
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    const amountInCents = amount * 100;
    //Date with format "YYYY-MM-DD" for the invoice's creation date
    const date = new Date().toISOString().split('T')[0];

    await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

