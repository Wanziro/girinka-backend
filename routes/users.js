const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const auth = require("../middleware/auth");
const protectRoute = require("../middleware/protectRoutes");

const Users = require("../model/users");

router.post("/login", async (req, res) => {
  try {
    // Get user input
    const { email, password } = req.body;

    // Validate user input
    if (!(email && password)) {
      return res
        .status(400)
        .send({ msg: "Please provide your email and password" });
    }
    // Validate if user exist in our database
    const user = await Users.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const token = jwt.sign(
        {
          user_id: user._id,
          email,
          role: user.role,
          phone: user.phone,
          createdAt: user.createdAt,
          roleId: user.roleId,
          companyName: user.companyName,
          fullName: user.fullName,
        },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );

      // save user token
      user.token = token;

      // user
      res.status(200).json({
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        companyName: user.companyName,
        role: user.role,
        roleId: user.roleId,
        token: user.token,
      });
    } else {
      res.status(400).send({ msg: "Wrong username or password" });
    }
  } catch (err) {
    console.log(err);
    res.status(400).send({
      msg: "Something went wrong while signing into your account. Try again later",
    });
  }
});

router.post("/updateInfo/", auth, (req, res) => {
  const { fullName, phone } = req.body;
  Users.updateOne(
    { _id: req.user.user_id },
    { fullName, phone },
    (err, result) => {
      if (err) {
        return res.status(400).send({ msg: err.message });
      } else {
        res.status(200).send({ result });
      }
    }
  );
});

router.delete("/:id", auth, (req, res) => {
  const id = req.params["id"];
  Users.deleteOne({ _id: id }, (err, result) => {
    if (err) {
      return res.status(400).send({ msg: err.message });
    } else {
      res.status(200).send({ msg: "User deleted successfull", result });
    }
  });
});

// admin
router.post("/userInfo/", auth, (req, res) => {
  const { i } = req.body;
  Users.find({ _id: i }, (err, result) => {
    if (err) {
      return res.status(400).send({ msg: err.message });
    } else {
      return res.status(200).send({ result });
    }
  });
});
// admin

router.post("/updatePassword/", auth, async (req, res) => {
  const { newPwd, currentPwd } = req.body;
  try {
    const user = await Users.findOne({ _id: req.user.user_id });
    if (user && (await bcrypt.compare(currentPwd, user.password))) {
      encryptedPassword = await bcrypt.hash(newPwd, 10);
      Users.updateOne(
        { _id: req.user.user_id },
        { password: encryptedPassword },
        (err, result) => {
          if (err) {
            return res.status(400).send({ msg: err.message });
          } else {
            res.status(200).send({ result });
          }
        }
      );
    } else {
      res.status(400).send({ msg: "Wrong old password" });
    }
  } catch (err) {
    console.log(err);
    res.status(400).send({
      msg: "Something went wrong. Try again later",
    });
  }
});

router.get("/", auth, protectRoute(["admin"]), async (req, res) => {
  try {
    const users = await Users.find({ role: { $ne: "admin" } });
    res.status(200).send({
      users,
    });
  } catch (error) {
    res.status(400).send({ msg: error.message });
  }
});

router.post("/register", auth, protectRoute(["admin"]), async (req, res) => {
  try {
    // Get user input
    const { fullName, email, password, phone, role, roleId, companyName } =
      req.body;

    // Validate user input
    if (
      !(email && password && fullName && phone && role && roleId && companyName)
    ) {
      res.status(400).send({
        status: "Error",
        msg: "Provide correct info",
      });
    }

    // check if user already exist
    // Validate if user exist in our database
    const oldUser = await Users.findOne({ email, phone });

    if (oldUser) {
      return res
        .status(409)
        .send({ msg: "Email and phone number already exists." });
    }

    //Encrypt user password
    encryptedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const user = await Users.create({
      fullName,
      phone,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
      roleId,
      role,
      companyName,
    });

    // Create token
    const token = jwt.sign(
      {
        user_id: user._id,
        email,
        fullName,
        role: user.role,
        roleId: user.roleId,
        phone: user.phone,
        companyName: user.companyName,
        createdAt: user.createdAt,
      },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );
    // save user token
    user.token = token;

    // return new user
    return res.status(201).json({
      status: "success",
      msg: "User created successfull!",
      user: {
        ...user._doc,
        password: "",
      },
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      msg: err.message,
    });
  }
});

module.exports = router;
