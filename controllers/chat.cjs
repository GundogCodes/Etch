const Chat = require('../models/chat.cjs')
const User = require('../models/user.cjs')
//create a chat

exports.createChat = async (req,res)=>{
    try {
        const userId = req.user._id
        const friendId = req.params.id
        const isChat = await Chat.findOne({
            users:{$all:[userId,friendId]}
        })
        const isChatty = await Chat.findOne({
            users:{$all:[friendId,userId]}
        })
        .populate('users')
        .populate('groupAdmin')
        if(isChat || isChatty){
            res.json(isChat)
        } else{   
            const user = await User.findOne({_id:req.user._id})
            const friend = await User.findOne({_id:req.params.id})
            const aNewChat = {}
            aNewChat.chatName = user._id +friend._id
            aNewChat.isGroupChat = true
            aNewChat.users = []
            aNewChat.users.push(user)
            aNewChat.users.push(friend)
            aNewChat.groupAdmin = user
            await Chat.create(aNewChat)
            const newChat =  await Chat.findOne({chatName:aNewChat.chatName})
            .populate('users')
            .populate('groupAdmin')
            res.json(newChat)
        }
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

//get chat
exports.getChat = async (req,res)=>{
    try {
        const chat = await Chat.findOne({_id:req.params.id})
        .populate('users')
        .populate('groupAdmin')
        if(chat){
            res.json(chat)
        } else{
            res.json('Chat does not exist')
            
        }
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}
//delete chat

exports.deleteChat = async (req,res)=>{
    try {
        const chat = await Chat.findOneAndDelete({_id:req.params.id})
        if(!chat){
            res.json('chat does not exist')
        } else{
            res.json('chat deleted')
            
        }
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}