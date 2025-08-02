require('dotenv').config();
const express = require('express')
const cors = require('cors')
const app = express()
// const jwt=require('jsonwebtoken')
// const cookieParser = require('cookie-parser')
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: axios } = require('axios');


app.use(cors())
// app.use(cors({
//     origin: ['client side base url'],
//     credentials: true
// }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yp67wht.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Store ID: tripb688d042d40223
// Store Password (API/Secret Key): tripb688d042d40223@ssl


// Merchant Panel URL: https://sandbox.sslcommerz.com/manage/ (Credential as you inputted in the time of registration)



// Store name: testtripbd966
// Registered URL: www.tripbuzz.com
// Session API to generate transaction: https://sandbox.sslcommerz.com/gwprocess/v3/api.php
// Validation API: https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?wsdl
// Validation API (Web Service) name: https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // await client.connect();

        const packagesCollection = client.db('packagedb').collection('package');
        const bookingsCollection = client.db('packagedb').collection('bookings');
        const usersCollection = client.db('packagedb').collection('users');
        const paymentsCollection = client.db('packagedb').collection('payments');
        const merchantCollection = client.db('packagedb').collection('merchant');


        app.get('/packages', async (req, res) => {

            const email = req.query.email;
            const query = {};
            if (email) {
                query.guideEmail = email;
            }

            const cursor = packagesCollection.find(query);
            const result = await cursor.toArray();
            // const result = await packagesCollection.find().toArray();
            res.send(result);
        });
        app.get('/packages/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await packagesCollection.findOne(query);
            res.send(result);
        })


        app.post('/packages', async (req, res) => {
            const newPackage = req.body;
            console.log(newPackage);
            const result = await packagesCollection.insertOne(newPackage);
            res.send(result);
        })

        app.delete('/packages/:id', async (req, res) => {
            const id = req.params.id;
            const result = await packagesCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        // bookings api
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;

            const query = {
                buyer_email: email
            }
            const result = await bookingsCollection.find(query).toArray();

            // bad way to aggregate data
            // for (const booking of result) {
            //     const jobId = application.jobId;
            //     const jobQuery = { _id: new ObjectId(jobId) }
            //     const job = await jobsCollection.findOne(jobQuery);
            //     application.company = job.company
            //     application.title = job.title
            //     application.company_logo = job.company_logo
            // }

            res.send(result);
        });

        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            console.log(bookings);    
            const result = await bookingsCollection.insertOne(bookings);
            res.send(result);
        });

        // payments api
        app.post('/create-ssl-payment', async (req, res) => {
            const payment = req.body;
            console.log(payment);
            const trxid = new ObjectId().toString();
            payment.transactionId = trxid;
            //step-1: initiate the payment
            const initiate = {
                store_id: `${process.env.STORE_ID}`,
                store_passwd: `${process.env.STORE_PASSWORD}`,
                total_amount: `${payment.price}`,
                currency: 'BDT',
                tran_id: trxid, // use unique tran_id for each api call
                success_url: 'http://localhost:4000/success-payment',
                fail_url: 'http://localhost:5174/fail',
                cancel_url: 'http://localhost:5174/cancel',
                ipn_url: 'http://localhost:4000/ipn-succcess-payment',
                shipping_method: 'Courier',
                product_name: 'Computer.',
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: `${payment.name}`,
                cus_email: `${payment.email}`,
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };
            //step-2: send the initiate request to sslcommerz
            const iniResponse = await axios({
                url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
                method: "POST",
                data: initiate,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
            console.log('iniResponse.data'.iniResponse);
            //step-3:get the gateway url from the response
            const gatewayUrl = iniResponse?.data?.GatewayPageURL;
            console.log('gatewayUrl', gatewayUrl);
            const result = await paymentsCollection.insertOne(payment);
            //step-4: send the gateway url to the client
            res.send({ result, gatewayUrl });

        });


        app.post('/success-payment', async (req, res) => {
            //step-5:success payment data
            const paymentSuccess = req.body;
            console.log("Payment Success:", paymentSuccess);
            //step-6: validate the payment
            const { data } = await axios.get(`https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${paymentSuccess.val_id}&store_id=${process.env.STORE_ID}&store_passwd=${process.env.STORE_PASSWORD}&format=json`);
            // console.log("Payment Validation Response:", isValidPayment);
            //Validation Failed
            if (data.status !== 'VALID') {
                return res.status(400).send({ message: 'Payment validation failed' });
            }

            //update the payment to your database
            const updatePayment = await paymentsCollection.updateOne(
                { transactionId: data.tran_id },
                {
                    $set: {
                        status: "success",
                        val_id: data.val_id,
                        amount: data.amount,
                        currency: data.currency,
                        card_type: data.card_type,
                        card_no: data.card_no,
                        bank_tran_id: data.bank_tran_id,
                        card_issuer: data.card_issuer,
                        card_brand: data.card_brand,
                        card_issuer_country: data.card_issuer_country,
                        card_issuer_country_code: data.card_issuer_country_code,
                        card_issuer_country_name: data.card_issuer_country_name
                    }
                }
            );

            // Update the corresponding booking status to completed
            if (data.tran_id) {
                const payment = await paymentsCollection.findOne({
                    transactionId: data.tran_id
                });
            }
            // res.redirect(`http://localhost:5174/success?tran_id=${data.tran_id}&val_id=${data.val_id}`);
            res.redirect('http://localhost:5174/mybookings');
            console.log("Payment Updated:", updatePayment);

            
            //step-7:find the payment for more functionality
            // const payment = await paymentsCollection.findOne({
            //     transactionId: data.tran_id,
            // });
            // console.log("payment", payment);


            // carefully delete each item from the cart
            // console.log("payment info", payment);
            // const query = {
            //     id: {
            //         $in: payment.cartIds.map((id) => new ObjectId(id)),
            //     },
            // };
            // const deleteResult = await cartCollection.deleteMany(query);

            // const query = { transactionId: payment.tran_id };
            // const result = await paymentsCollection.updateOne(query, { $set: payment });
            // res.send(result);
        });




        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Tour Cooking')
});

app.listen(port, () => {
    console.log(`Tour package Booking Management API listening on port ${port}`)
});