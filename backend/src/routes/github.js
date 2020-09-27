var createError = require('http-errors');
const express = require('express');
const axios = require('axios');
const router = express.Router();
const codes = require('../config.secret.json');
const User = require('../models/User');
const { updateOne } = require('../models/User');
const { generateJWT } = require('../utils/auth');
const { hashPassword } = require('../utils/auth');
const { default: Axios } = require('axios');
const { NotExtended } = require('http-errors');

router.post('/register', async (req, res, next) => {
    
    console.log("perilla");

    const code = req.body.code;
    try{
    const result = await Axios.post(
        'https://github.com/login/oauth/access_token',
        {
            client_id: codes.githubClient,
            client_secret: codes.githubSecret,
            code: req.body.code
        },
        {headers: {Accept: 'application/json'}}
    );

    if (!result.data.error)
    {
        const resultTwo = await Axios.get(
            'https://api.github.com/user',
            {headers: {Authorization: 'token '+result.data.access_token}}
        )
        //console.log(resultTwo);
        console.log("ei erroreita")
            console.log("JOO1")
        if (resultTwo.status === 200)
        {
            
            if (resultTwo.data.login === null)
            {
                console.log("username not found");
                //return res.status(300).json({err: "email or username not found from github"});
            }
            
            const findId = await User.findOne({oauth: {$eq: {provider: 'github', email: resultTwo.data.id}}}, 'username');
            
            if (findId !== null)
            {
                next(createError(400, "The email given is already taken by someone"));
                throw "email taken";
            }
            let takenValue = false;
            let postfix = 0;
            let usernameTaken = true;
            let name = resultTwo.data.login;

            while (usernameTaken === true)
            {
                let usernameResult = await User.findOne({username: name}, 'username');
                console.log(usernameResult);
                if (usernameResult === null)
                    usernameTaken = false;
                else
                {
                    postfix++;
                    name = name + postfix;
                    takenValue = true;
                }
            }

            nameArray = resultTwo.data.name.split(' ');

            const newUser = {
                username: name,
                firstName: nameArray[0],
                lastName: nameArray[nameArray.length - 1],
                password: 'tempPass',
                oauth: {provider: 'github', email: resultTwo.data.id}
            };

            const newUserWithEmail = resultTwo.data.email ?
                {...newUser, email: resultTwo.data.email} :
                newUser;

            const newUserModel = new User(newUserWithEmail);

            const saveResult = await newUserModel.save();

            console.log(saveResult);

            res.json({
                username: name,
                takenValue,
                firstName: nameArray[0],
                id: saveResult._id
            })

        }
        else
        throw "something went wrong.. Propably github not working"
    }
    else
    {
        next(createError(400, "invalid code"));
        throw "invalid code";
    }

    
    }
    catch(err)
    {
        console.log(err);
    }
})

router.post('/login', async (req, res, next) => {
    console.log("logging");
    console.log(req.body.code);

    try
    {
        const loginResult = await Axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: codes.githubClient,
                client_secret: codes.githubSecret,
                code: req.body.code
            },
            {headers: {Accept: 'application/json'}}
        );


        if (!loginResult.data.error)
        {
            const loginResultTwo = await Axios.get(
                'https://api.github.com/user',
                {headers: {Authorization: 'token '+loginResult.data.access_token}}
            )
            console.log(loginResultTwo);

            if (loginResultTwo.status === 200)
            {
                var confirm = await User.findOne({
                    "oauth.provider": "github", "oauth.email": loginResultTwo.data.id
                })
                console.log(confirm);
                if (confirm !== null)
                {
                    token = generateJWT({username: confirm.username, profilePicture: confirm.profilePicture || null, id: confirm._id});
                    return res.status(200).json({
                        message: 'login success',
                        username: confirm.username,
                        token,
                        profilePicture: confirm.profilePicture || null,
                        id: confirm._id,
                        watched: confirm.watched,
                        myList: confirm.myList,
                        language: confirm.language,
                        mute: confirm.mute
                    });
                }
                else
                {
                    next(createError(301, "You are not registered yet. Please register first via github"));
                    throw "not registered";
                }
            }
            else
                throw "github not responding";
        }
        else
        {
            next(createError(400, "Invalid code"));
            throw "invalid code";
        }
    }
    catch(err)
    {
        console.log(err);
    }

})

router.post('/setPass', async (req, res) => {
    console.log(req.body.username);

    let response = await User.findOne({username: req.body.username}, 'password');
    console.log(req.body.password);
    if (response.password === 'tempPass')
    {
        let savePass = await User.updateOne({ username: req.body.username }, { $set: { password: await hashPassword(req.body.password) } });
        console.log(savePass);
    }
    else
        return res.status(400).send("not allowed");
    
    token = generateJWT({username: req.body.username, profilePicture: null, id: response._id});

    res.status(200).json({
        message: 'login success',
        username: req.body.user,
        token,
        profilePicture: null,
        id: response._id
    })

    console.log(response);


})


module.exports = router;
