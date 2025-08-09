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
        const merchantsCollection = client.db('packagedb').collection('merchants');

        // custom middlewares
        const verifyFBToken = async (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }

            // verify the token
            try {
                const decoded = await admin.auth().verifyIdToken(token);
                req.decoded = decoded;
                next();
            }
            catch (error) {
                return res.status(403).send({ message: 'forbidden access' })
            }
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        const verifyMerchant = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            if (!user || user.role !== 'merchant') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }


        //users api
        app.get('/users', async (req, res) => {
            try {
                const { search, role } = req.query;
                const query = {};

                if (search) {
                    query.email = { $regex: search, $options: 'i' }; // Case-insensitive search
                }

                if (role && role !== 'all') {
                    query.role = role;
                }

                const users = await usersCollection.find(query).toArray();
                res.send(users);
            } catch (error) {
                console.error("Error fetching users:", error);
                res.status(500).send({ error: "Failed to fetch users" });
            }
        });
        app.get("/users/search", async (req, res) => {
            const emailQuery = req.query.email;
            if (!emailQuery) {
                return res.status(400).send({ message: "Missing email query" });
            }

            const regex = new RegExp(emailQuery, "i"); // case-insensitive partial match

            try {
                const users = await usersCollection
                    .find({ email: { $regex: regex } })
                    // .project({ email: 1, createdAt: 1, role: 1 })
                    .limit(10)
                    .toArray();
                res.send(users);
            } catch (error) {
                console.error("Error searching users", error);
                res.status(500).send({ message: "Error searching users" });
            }
        });

        // GET: Get user role by email
        app.get('/users/:email/role', async (req, res) => {
            try {
                const email = req.params.email;

                if (!email) {
                    return res.status(400).send({ message: 'Email is required' });
                }

                const user = await usersCollection.findOne({ email });

                if (!user) {
                    return res.status(404).send({ message: 'User not found' });
                }

                res.send({ role: user.role || 'user' });
            } catch (error) {
                console.error('Error getting user role:', error);
                res.status(500).send({ message: 'Failed to get role' });
            }
        });


        app.post('/users', async (req, res) => {
            const email = req.body.email;
            const userExists = await usersCollection.findOne({ email })
            if (userExists) {
                // update last log in
                return res.status(200).send({ message: 'User already exists', inserted: false });
            }
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.patch("/users/:id/role", async (req, res) => {
            const { id } = req.params;
            const { role } = req.body;

            if (!["admin", "user"].includes(role)) {
                return res.status(400).send({ message: "Invalid role" });
            }

            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role } }
                );
                res.send({ message: `User role updated to ${role}`, result });
            } catch (error) {
                console.error("Error updating user role", error);
                res.status(500).send({ message: "Failed to update user role" });
            }
        });





        // packages api
        // app.get('/packages', async (req, res) => {

        //     const email = req.query.email;
        //     const query = {};
        //     if (email) {
        //         query.guideEmail = email;
        //     }

        //     const cursor = packagesCollection.find(query);
        //     const result = await cursor.toArray();
        //     // const result = await packagesCollection.find().toArray();
        //     res.send(result);
        // });



        // app.post('/packages', async (req, res) => {
        //     const newPackage = req.body;
        //     console.log(newPackage);
        //     const result = await packagesCollection.insertOne(newPackage);
        //     res.send(result);
        // })
        // Get merchant profile by email
        app.get('/merchants/profile/:email', async (req, res) => {
            try {
                const { email } = req.params;

                const merchant = await merchantsCollection.findOne({
                    'userInfo.email': email
                });

                if (!merchant) {
                    return res.status(404).send({
                        success: false,
                        message: 'Merchant profile not found'
                    });
                }

                // Return only necessary data
                const responseData = {
                    success: true,
                    data: {
                        userInfo: {
                            name: merchant.userInfo.name,
                            email: merchant.userInfo.email,
                            phone: merchant.userInfo.phone
                        },
                        businessInfo: merchant.businessInfo,
                        address: merchant.address,
                        status: merchant.status
                    }
                };

                res.send(responseData);
            } catch (error) {
                console.error('Error fetching merchant profile:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to fetch merchant profile',
                    error: error.message
                });
            }
        });

        // // Update merchant profile
        // app.patch('/merchants/profile/:email', async (req, res) => {
        //     try {
        //         const { email } = req.params;
        //         const updateData = req.body;

        //         // Validate required fields
        //         if (!updateData.phone || !updateData.businessInfo?.businessName) {
        //             return res.status(400).send({
        //                 success: false,
        //                 message: 'Phone and Business Name are required'
        //             });
        //         }

        //         // Prepare update document
        //         const updateDoc = {
        //             $set: {
        //                 'userInfo.phone': updateData.phone,
        //                 'businessInfo.businessName': updateData.businessInfo.businessName,
        //                 'businessInfo.businessType': updateData.businessInfo.businessType,
        //                 'businessInfo.description': updateData.businessInfo.description,
        //                 'businessInfo.website': updateData.businessInfo.website,
        //                 'businessInfo.yearsInOperation': updateData.businessInfo.yearsInOperation,
        //                 'businessInfo.taxId': updateData.businessInfo.taxId,
        //                 'address.street': updateData.address.street,
        //                 'address.city': updateData.address.city,
        //                 'address.state': updateData.address.state,
        //                 'address.postalCode': updateData.address.postalCode,
        //                 'address.country': updateData.address.country,
        //                 lastUpdated: new Date()
        //             }
        //         };

        //         const result = await merchantsCollection.updateOne(
        //             { 'userInfo.email': email },
        //             updateDoc
        //         );

        //         if (result.matchedCount === 0) {
        //             return res.status(404).send({
        //                 success: false,
        //                 message: 'Merchant not found'
        //             });
        //         }

        //         res.send({
        //             success: true,
        //             message: 'Profile updated successfully',
        //             modifiedCount: result.modifiedCount
        //         });
        //     } catch (error) {
        //         console.error('Error updating merchant profile:', error);
        //         res.status(500).send({
        //             success: false,
        //             message: 'Failed to update merchant profile',
        //             error: error.message
        //         });
        //     }
        // });
        // Logo upload endpoint
        app.post('/merchants/upload-logo', async (req, res) => {
            try {
                if (!req.files || !req.files.image) {
                    return res.status(400).send({
                        success: false,
                        message: 'No image file provided'
                    });
                }

                const imageFile = req.files.image;

                // Validate file type
                const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!validTypes.includes(imageFile.mimetype)) {
                    return res.status(400).send({
                        success: false,
                        message: 'Only JPG, PNG, or WEBP images are allowed'
                    });
                }

                // Validate file size (max 2MB)
                if (imageFile.size > 2 * 1024 * 1024) {
                    return res.status(400).send({
                        success: false,
                        message: 'Image size must be less than 2MB'
                    });
                }

                // Generate unique filename
                const fileName = `logo_${Date.now()}${path.extname(imageFile.name)}`;
                const uploadPath = path.join(__dirname, 'uploads', 'logos', fileName);

                // Create uploads directory if it doesn't exist
                if (!fs.existsSync(path.dirname(uploadPath))) {
                    fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
                }

                // Save file locally (in production, upload to Cloudinary/S3)
                await imageFile.mv(uploadPath);

                // In production, you would upload to Cloudinary/S3 here
                // const cloudinaryRes = await cloudinary.uploader.upload(uploadPath);
                // const imageUrl = cloudinaryRes.secure_url;

                // For demo purposes, we'll return a local path
                const imageUrl = `/uploads/logos/${fileName}`;

                res.send({
                    success: true,
                    url: imageUrl
                });
            } catch (error) {
                console.error('Logo upload error:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to upload logo',
                    error: error.message
                });
            }
        });

        // Update merchant profile (updated to handle logo)
        app.patch('/merchants/profile/:email', async (req, res) => {
            try {
                const { email } = req.params;
                const updateData = req.body;

                // Prepare update document
                const updateDoc = {
                    $set: {
                        'userInfo.phone': updateData.phone,
                        'businessInfo.businessName': updateData.businessInfo.businessName,
                        'businessInfo.businessType': updateData.businessInfo.businessType,
                        'businessInfo.description': updateData.businessInfo.description,
                        'businessInfo.website': updateData.businessInfo.website,
                        'businessInfo.yearsInOperation': updateData.businessInfo.yearsInOperation,
                        'businessInfo.taxId': updateData.businessInfo.taxId,
                        'businessInfo.logoUrl': updateData.businessInfo.logoUrl,
                        'address.street': updateData.address.street,
                        'address.city': updateData.address.city,
                        'address.state': updateData.address.state,
                        'address.postalCode': updateData.address.postalCode,
                        'address.country': updateData.address.country,
                        lastUpdated: new Date()
                    }
                };

                const result = await merchantsCollection.updateOne(
                    { 'userInfo.email': email },
                    updateDoc
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: 'Merchant not found'
                    });
                }

                res.send({
                    success: true,
                    message: 'Profile updated successfully',
                    modifiedCount: result.modifiedCount
                });
            } catch (error) {
                console.error('Error updating merchant profile:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to update merchant profile',
                    error: error.message
                });
            }
        });






        // Submit new package (from merchant)
        app.post('/packages', async (req, res) => {
            try {
                const packageData = {
                    ...req.body,
                    status: 'pending', // Default status
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await packagesCollection.insertOne(packageData);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error creating package:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to create package: ' + error.message
                });
            }
        });
        app.get('/packages', async (req, res) => {
            const result = await packagesCollection.find().toArray();
            res.send(result);
        });

        // Get pending packages (for admin)
        app.get('/packages/pending', async (req, res) => {
            try {
                const pendingPackages = await packagesCollection
                    .find({ status: 'pending' })
                    .sort({ createdAt: -1 })
                    .toArray();

                res.send(pendingPackages);
            } catch (error) {
                console.error('Error fetching pending packages:', error);
                res.status(500).send({ error: 'Failed to load pending packages' });
            }
        });
        app.get('/packages/approved', async (req, res) => {
            try {
                const approvedPackages = await packagesCollection
                    .find({ status: 'approved' })
                    .sort({ createdAt: -1 })
                    .toArray();

                res.send(approvedPackages);
            } catch (error) {
                console.error('Error fetching approved packages:', error);
                res.status(500).send({ error: 'Failed to load packages' });
            }
        });

        app.get('/packages/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await packagesCollection.findOne(query);
            res.send(result);
        })
        app.put('/packages/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const updatedPackage = req.body;

                const result = await packagesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            ...updatedPackage,
                            updatedAt: new Date()
                        }
                    }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({ error: 'Package not found' });
                }

                res.send({ success: true, modifiedCount: result.modifiedCount });
            } catch (error) {
                console.error('Error updating package:', error);
                res.status(500).send({ error: 'Failed to update package' });
            }
        });

        // Update package status (approve/reject)
        app.patch('/packages/:id/status', async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body;
                const validStatuses = ['approved', 'rejected'];

                if (!validStatuses.includes(status)) {
                    return res.status(400).send({ error: 'Invalid status value' });
                }

                const result = await packagesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            status,
                            updatedAt: new Date(),
                            reviewedBy: req.user?.id || 'admin'
                        }
                    }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({ error: 'Package not found' });
                }

                res.send({
                    success: true,
                    modifiedCount: result.modifiedCount
                });

            } catch (error) {
                console.error('Error updating package status:', error);
                res.status(500).send({ error: 'Failed to update package status' });
            }
        });

        app.delete('/packages/:id', async (req, res) => {
            const id = req.params.id;
            const result = await packagesCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });


        //Admin Dashboard statistics
        app.get('/dashboard/stats', async (req, res) => {
            try {
                const [totalPackages, pendingPackages, approvedPackages, approvedPackagesData] = await Promise.all([
                    packagesCollection.countDocuments(),
                    packagesCollection.countDocuments({ status: 'pending' }),
                    packagesCollection.countDocuments({ status: 'approved' }),
                    packagesCollection.find({ status: 'approved' }).toArray()
                ]);
                const totalRevenue = approvedPackagesData.reduce((sum, pkg) => {
                    return sum + parseFloat(pkg.price || 0);
                }, 0);

                console.log('Total Revenue:', totalRevenue);

                res.send({
                    success: true,
                    data: {
                        totalPackages,
                        pendingPackages,
                        approvedPackages,
                        totalRevenue
                    }
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to fetch dashboard statistics'
                });
            }
        });


        // Get recent packages with optional limit
        app.get('/dashboard/recent-packages', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 5;

                const recentPackages = await packagesCollection.find()
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .project({
                        tourName: 1,
                        destination: 1,
                        price: 1,
                        status: 1,
                        createdAt: 1
                    })
                    .toArray();

                res.send({
                    success: true,
                    data: recentPackages
                });
            } catch (error) {
                console.error('Error fetching recent packages:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to fetch recent packages'
                });
            }
        });

        // Get pending packages for approval
        app.get('/dashboard/pending-packages', async (req, res) => {
            try {
                const pendingPackages = await packagesCollection.find({ status: 'pending' })
                    .sort({ createdAt: -1 })
                    .project({
                        tourName: 1,
                        destination: 1,
                        price: 1,
                        createdAt: 1,
                        guideName: 1
                    })
                    .toArray();

                res.send({
                    success: true,
                    data: pendingPackages
                });
            } catch (error) {
                console.error('Error fetching pending packages:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to fetch pending packages'
                });
            }
        });

        // Update package status (approve/reject)
        app.patch('/dashboard/packages/:id/status', async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body;
                const validStatuses = ['approved', 'rejected'];

                if (!validStatuses.includes(status)) {
                    return res.status(400).send({
                        success: false,
                        message: 'Invalid status value'
                    });
                }

                const result = await packagesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            status,
                            updatedAt: new Date(),
                            reviewedBy: req.decoded?.email || 'admin'
                        }
                    }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: 'Package not found'
                    });
                }

                res.send({
                    success: true,
                    modifiedCount: result.modifiedCount
                });
            } catch (error) {
                console.error('Error updating package status:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to update package status'
                });
            }
        });



        // bookings api
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;

            const query = {
                userEmail: email
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


        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
            res.send(booking);
        });

        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            const result = await bookingsCollection.insertOne(bookings);
            res.send(result);
        });

        app.post('/merchants', async (req, res) => {
            try {
                const merchantData = {
                    ...req.body,
                    createdAt: new Date(),
                    lastUpdated: new Date(),
                    status: req.body.status || 'pending' // Default to pending
                };
                const result = await merchantsCollection.insertOne(merchantData);
                res.status(201).send(result);
            } catch (error) {
                console.error('Error creating merchant:', error);
                res.status(500).send({ error: 'Failed to create merchant' });
            }
        });

        // Get merchants with status filtering
        app.get('/merchants', async (req, res) => {
            try {
                const { status } = req.query;
                let query = {};

                if (status) {
                    query.status = status;
                } else {
                    query.status = { $ne: 'blocked' };
                }

                const merchants = await merchantsCollection.find(query).toArray();
                res.send(merchants);
            } catch (error) {
                console.error('Error fetching merchants:', error);
                res.status(500).send({ error: 'Failed to fetch merchants' });
            }
        });

        // Get pending merchants (legacy endpoint)
        app.get('/merchants/pending', async (req, res) => {
            try {
                const pendingMerchants = await merchantsCollection
                    .find({ status: 'pending' })
                    .toArray();
                res.send(pendingMerchants);
            } catch (error) {
                console.error('Error fetching pending merchants:', error);
                res.status(500).send({ error: 'Failed to load pending merchants' });
            }
        });

        app.get('/merchants/active', async (req, res) => {
            try {
                const activeMerchants = await merchantsCollection
                    .find({ status: 'active' })
                    .toArray();
                res.send(activeMerchants);
            } catch (error) {
                console.error('Error fetching active merchants:', error);
                res.status(500).send({ error: 'Failed to load active merchants' });
            }
        });

        // Update merchant status (enhanced)
        app.patch('/merchants/:id/status', async (req, res) => {
            const { id } = req.params;
            const { status, email } = req.body;
            const validStatuses = ['pending', 'active', 'suspended', 'blocked'];

            try {
                // Validate status
                if (!validStatuses.includes(status)) {
                    return res.status(400).send({ error: 'Invalid status value' });
                }

                const query = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        status,
                        lastUpdated: new Date(),
                        ...(status === 'blocked' && { isActive: false }) // Additional blocked state
                    }
                };

                // Update merchant status
                const result = await merchantsCollection.updateOne(query, updateDoc);

                if (result.matchedCount === 0) {
                    return res.status(404).send({ error: 'Merchant not found' });
                }

                // Update user role if activating merchant
                if (status === 'active' && email) {
                    await usersCollection.updateOne(
                        { email },
                        { $set: { role: 'merchant' } }
                    );
                }

                // Remove merchant role if blocking
                if (status === 'blocked' && email) {
                    await usersCollection.updateOne(
                        { email },
                        { $set: { role: 'user' } }
                    );
                }

                res.send({
                    success: true,
                    modifiedCount: result.modifiedCount
                });

            } catch (error) {
                console.error('Error updating merchant status:', error);
                res.status(500).send({ error: 'Failed to update merchant status' });
            }
        });

        // Additional endpoint for merchant statistics
        app.get('/merchants/stats', async (req, res) => {
            try {
                const stats = {
                    total: await merchantsCollection.countDocuments({ status: { $ne: 'blocked' } }),
                    byStatus: await merchantsCollection.aggregate([
                        { $group: { _id: '$status', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ]).toArray(),
                    recent: await merchantsCollection.find()
                        .sort({ createdAt: -1 })
                        .limit(5)
                        .toArray()
                };
                res.send(stats);
            } catch (error) {
                console.error('Error fetching merchant stats:', error);
                res.status(500).send({ error: 'Failed to load merchant statistics' });
            }
        });


        // payments api
        app.post('/create-ssl-payment', async (req, res) => {
            const payment = req.body;
            console.log(payment);
            // const payment = req.body;
            const bookingId = String(payment.bookingId)
            console.log('bookingId', bookingId);
            const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });

            if (!booking) {
                return res.status(404).send({ error: 'Booking not found' });
            }
            if (booking.payment_status === 'paid') {
                return res.status(400).send({ error: 'Payment already completed for this booking.' });
            }

            const trxid = new ObjectId().toString();
            payment.transactionId = trxid;
            //step-1: initiate the payment
            const initiate = {
                store_id: `${process.env.STORE_ID}`,
                store_passwd: `${process.env.STORE_PASSWORD}`,
                total_amount: `${payment.price}`,
                currency: 'BDT',
                tran_id: trxid,
                success_url: 'https://cse-2100-project-server.vercel.app/success-payment',
                fail_url: 'https://cse-2100-project.web.app/fail',
                cancel_url: 'https://cse-2100-project.web.app/cancel',
                ipn_url: 'https://cse-2100-project-server.vercel.app/ipn-succcess-payment',
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
                if (payment && payment.bookingId) {
                    await bookingsCollection.updateOne(
                        { _id: new ObjectId(String(payment.bookingId)) },
                        { $set: { payment_status: 'paid' } }
                    );
                }
            }
            // res.redirect(`https://cse-2100-project-server.vercel.app/success?tran_id=${data.tran_id}&val_id=${data.val_id}`);
            res.redirect('https://cse-2100-project.web.app/mybookings');
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