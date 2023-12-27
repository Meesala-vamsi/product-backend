const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const jwt = require('jsonwebtoken')
const bcrypt=require('bcrypt')
const path = require('path')
const nodemailer = require('nodemailer');
const {v4: uuidv4} = require('uuid')

const dbPath = path.join(__dirname,'users.db')
const app = express();

let db=null 

app.use(express.json())


const initializeDB = async ()=>{
    try{
        db=await open({
        filename:dbPath,
        driver:sqlite3.Database
    });
    app.listen(4000,()=>{
        console.log(`The Server is running at http://localhost:4000`)
    });
}catch(e){
    console.log(e.message)
    process.exit(1)
}
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure:false,
    auth: {
        user: 'vamsimeesala789@gmail.com',
        pass: 'cufi blvn ygwp dush'
    },
    authMethod: 'LOGIN'
});

function generateVerificationToken() {
    return uuidv4(); 
}


const middleWare = (request,response,next)=>{
    const getHead=request.headers['authorization']
    let token = null
    if(getHead!==undefined){
        token = getHead.split(" ")[1]
    }
    if(token===undefined){
        response.status(404)
        response.send("Invalid JWT token")
    }else{
        jwt.verify(token,'vamsisony',async(error,user)=>{
            if(error){
                response.status(404);
                response.send("Invalid JWT TOken")
            }else{
                next()
            }
        })
    }
}

app.post('/login',async(request,response)=>{
  const {username,password} = request.body 
  const getUserStatusQuery = `SELECT * FROM user WHERE username='${username}'`
  const getUserStatus= await db.get(getUserStatusQuery)
  const hashedPassword= await bcrypt.hash(password,10)
  
  if(getUserStatus===undefined){
    response.status(404);
    response.send("Username Not Found")
  }else{
    const checkPasswordStatus=await bcrypt.compare(password,hashedPassword)
    console.log(hashedPassword)
    if(checkPasswordStatus===true){
        const generateToken = jwt.sign({username},"vamsisony")
        response.send(generateToken)
    }else{
        response.status(404);
        response.send('Incorrect Password')
    }
  }
})

app.get('/',middleWare,async(request,response)=>{
    response.send("Login Success")
})

app.post('/signin',async(request,response)=>{
    const {password,username,email}= request.body

    const verificationToken = generateVerificationToken();
    const hashedPassword=await bcrypt.hash(password,10)
    const addUserQuery = `
    INSERT INTO user(
        username,password,email,verification_token
    )
    VALUES
    ('${username}','${hashedPassword}','${email}','${verificationToken}')
    `
    const addUser=await db.run(addUserQuery);
    if (addUser!==undefined){
            response.send("Username Already Exists!!")
    } else {
                // Create the verification link
        const verificationLink = `https://yourwebsite.com/verify/${verificationToken}`;

                // Send email with verification link to the provided email address
        const mailOptions = {
            from: 'vamsimeesala2003@gmail.com',
            to: email,
            subject: 'Email Verification',
            html: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
        };

        transporter.sendMail(mailOptions, (mailErr, info) => {
            if (mailErr) {
                console.error('Error sending email:', mailErr);
                response.status(500).send('Error sending verification email');
            } else {
                console.log('Email sent:', info.response);
                response.status(200).send('Registration successful. Please verify your email.');
            }
        });
    }
})

initializeDB()