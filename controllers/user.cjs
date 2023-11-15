const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user.cjs");
const Post = require("../models/post.cjs");
const Forum = require("../models/forums.cjs");
const Chat = require("../models/chat.cjs");

//function to create a token using JWT
function createJWT(user) {
  return jwt.sign({ user }, process.env.SECRET, { expiresIn: "24h" });
}

//checkToken function which responds with the expiry of the the token
function checkToken(req, res) {
  console.log("req.exp", req.exp);
  res.json(req.exp);
}

//authencationn function which returns the local token
const apiController = {
  auth(req, res) {
    res.json(res.locals.data.token);
  },
};
//********************************************CRUD********************************************//
const dataController = {
  //C
  async createUser(req, res, next) {
    try {
      const user = await User.create(req.body)
        .populate("friends")
        .populate("followedForums")
        .populate("posts");
      const token = createJWT(user);
      console.log(user);
      req.user = user;
      res.locals.data.user = user;
      res.locals.data.token = token;
      console.log("----res.locals.data.user-----", res.locals.data.user);
      console.log("----res.locals.data.token-----", res.locals.data.token);
      res.json(token);
    } catch (error) {
      res.status(400).json({ error: error.message });
      console.log("Ya gatta database prablem son");
    }
  },

  //R
  async getUser(req, res, next) {
    try {
      const foundUser = await User.findOne({ _id: req.params.id })
        .populate("friends")
        .populate("followedForums")
        .populate("posts");
      if (foundUser) {
        res.json(foundUser);
      } else {
        res.status(200).json("User not found");
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async loginUser(req, res, next) {
    try {
      const user = await User.findOne({ email: req.body.email })
        .populate("friends")
        .populate("followedForums")
        .populate("posts");
      if (!user) throw Error();
      const match = await bcrypt.compare(req.body.password, user.password);
      if (!match) throw new Error();
      req.user = user;
      res.locals.data.user = user;
      const token = createJWT(user);
      res.locals.data.token = token;
      console.log("----res.locals.data.user-----", res.locals.data.user);
      console.log("----res.locals.data.token-----", res.locals.data.token);
      res.status(200).json(token);
    } catch (error) {
      res.status(400).json("Bad Credentials");
    }
  },

  //U
  async updateUser(req, res, next) {
    try {
      const updatedUser = await User.findOneAndUpdate(
        { _id: req.params.id },
        req.body,
        { new: true }
      )
        .populate("friends")
        .populate("followedForums")
        .populate("posts");
      res.json(updatedUser);
      res.locals.data.user = updatedUser;
      res.locals.data.user = req.user.token;
      next();
    } catch (error) {
      res.status(400).json("Bad Credentials");
    }
  },

  //D
  async deleteUser(req, res, next) {
    try {
      const findUser = await User.findOne({ _id: req.params.id });
      console.log(findUser);
      console.log("findUser.email", findUser.email);
      console.log("req.body", req.body.email);
      console.log(
        "request password: ",
        req.body.password,
        " database userPass",
        findUser.password
      );
      //   const match = await bcrypt.compare(req.body.password, findUser.password);
      //   console.log(match);
      if (
        findUser.email !== req.body.email ||
        findUser.password !== req.body.password
      ) {
        res.json("Password is incorrect or not Authorized");
      } else if (
        findUser.email === req.body.email &&
        findUser.password === req.body.password
      ) {
        await User.deleteOne(findUser);
        res.json("userDeleted");
      }
    } catch (error) {
      res.status(400).json("Bad Credentials");
    }
  },
  async getAllUsers(req, res) {
    try {
      const users = await User.find({})
        .populate("friends")
        .populate("followedForums")
        .populate("posts");
      res.json(users);
    } catch (error) {
      res.status(400).json(error);
    }
  },
  async getUserPosts(req, res) {
    try {
      //console.log('hehe',req.user)
      const userPosts = await Post.find({ sender: req.user._id })
        .populate("forum")
        .populate("comments");
      if (userPosts.length !== 0) {
        res.json(userPosts);
      } else {
        res.json("no posts");
      }
    } catch (error) {
      res.status(400).json(error);
    }
  },
  async getUserFollowedForums(req, res) {
    try {
      const userForums = await Forum.find({ members: req.user });
      console.log();
    } catch (error) {
      res.status(400).json(error);
    }
  },
  async addFriend(req, res) {
    try {
      const user = req.user;
      const friendId = req.params.id;
      const friend = await User.findOne({ _id: friendId });
      console.log(user.friends.length);
      console.log(user.friends);
      if (!user) {
        res.json("Login to continue");
      }

      if (user.friends.includes(friendId)) {
        res.json(user);
      } else {
        const newFriend = await User.findByIdAndUpdate(
          { _id: friendId },
          { $push: { friends: user._id } },
          { new: true }
        );

        const updatedUser = await User.findByIdAndUpdate(
          { _id: user._id },
          { $push: { friends: newFriend._id } },
          { new: true }
        )
          .populate("friends")
          .populate("followedForums")
          .populate("posts");
        /**************** create a new chat for new friend */
        const aNewChat = {};
        aNewChat.chatName = user._id + friendId;
        aNewChat.isGroupChat = true;
        aNewChat.users = [];
        aNewChat.users.push(user);
        aNewChat.users.push(friend);
        aNewChat.groupAdmin = user;
        await Chat.create(aNewChat);
        const newChat = await Chat.findOne({ chatName: aNewChat.chatName })
          .populate("users")
          .populate("groupAdmin");
        res.json(updatedUser);
      }
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Bad Request" });
    }
  },
  async removeFriend(req, res) {
    try {
      const removingFriend = await User.findOne({ _id: req.params.id });
      if (!req.user) {
        res.json("Login to continue");
      }
      if (!removingFriend) {
        return res.status(404).json({ error: "Friend not found" });
      } else {
        await User.findByIdAndUpdate(
          { _id: removingFriend._id },
          { $pull: { friends: req.user._id } },
          { new: true }
        );

        const updatedUser = await User.findByIdAndUpdate(
          { _id: req.user._id },
          { $pull: { friends: removingFriend._id } },
          { new: true }
        )
          .populate("friends")
          .populate("followedForums")
          .populate("posts");
        res.json(updatedUser);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
};

module.exports = {
  checkToken,
  dataController,
  apiController,
};
