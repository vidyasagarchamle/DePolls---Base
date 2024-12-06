// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DePollsToken.sol";

contract DePolls is Ownable {
    struct Option {
        string text;
        uint256 voteCount;
    }

    struct Poll {
        uint256 id;
        address creator;
        string question;
        Option[] options;
        uint256 deadline;
        bool isWeighted;
        bool isMultipleChoice;
        mapping(address => bool) hasVoted;
        mapping(address => uint256[]) votes;
        bool isActive;
    }

    uint256 public pollCount;
    mapping(uint256 => Poll) public polls;
    DePollsToken public rewardToken;
    uint256 public constant REWARD_AMOUNT = 10 * 10**18; // 10 tokens

    event PollCreated(uint256 indexed pollId, address creator, string question);
    event Voted(uint256 indexed pollId, address voter, uint256[] optionIndices);

    constructor(address _tokenAddress) {
        rewardToken = DePollsToken(_tokenAddress);
    }

    function createPoll(
        string memory _question,
        string[] memory _options,
        uint256 _deadline,
        bool _isWeighted,
        bool _isMultipleChoice
    ) public returns (uint256) {
        require(_options.length >= 2, "Minimum 2 options required");
        require(_deadline > block.timestamp, "Deadline must be in future");

        uint256 pollId = pollCount++;
        Poll storage newPoll = polls[pollId];
        newPoll.id = pollId;
        newPoll.creator = msg.sender;
        newPoll.question = _question;
        newPoll.deadline = _deadline;
        newPoll.isWeighted = _isWeighted;
        newPoll.isMultipleChoice = _isMultipleChoice;
        newPoll.isActive = true;

        for (uint i = 0; i < _options.length; i++) {
            newPoll.options.push(Option({
                text: _options[i],
                voteCount: 0
            }));
        }

        emit PollCreated(pollId, msg.sender, _question);
        return pollId;
    }

    function vote(uint256 _pollId, uint256[] memory _optionIndices) public {
        Poll storage poll = polls[_pollId];
        require(poll.isActive, "Poll is not active");
        require(block.timestamp < poll.deadline, "Poll has ended");
        require(!poll.hasVoted[msg.sender], "Already voted");
        require(_optionIndices.length > 0, "Must vote for at least one option");
        
        if (!poll.isMultipleChoice) {
            require(_optionIndices.length == 1, "Can only vote for one option");
        }

        for (uint i = 0; i < _optionIndices.length; i++) {
            require(_optionIndices[i] < poll.options.length, "Invalid option");
            if (poll.isWeighted) {
                // Implement weighted voting logic here
                poll.options[_optionIndices[i]].voteCount += 1; // Placeholder
            } else {
                poll.options[_optionIndices[i]].voteCount += 1;
            }
        }

        poll.hasVoted[msg.sender] = true;
        poll.votes[msg.sender] = _optionIndices;

        // Transfer reward tokens directly from this contract
        require(rewardToken.transfer(msg.sender, REWARD_AMOUNT), "Reward transfer failed");

        emit Voted(_pollId, msg.sender, _optionIndices);
    }

    function getPoll(uint256 _pollId) public view returns (
        uint256 id,
        address creator,
        string memory question,
        uint256 deadline,
        bool isWeighted,
        bool isMultipleChoice,
        bool isActive,
        Option[] memory options
    ) {
        Poll storage poll = polls[_pollId];
        return (
            poll.id,
            poll.creator,
            poll.question,
            poll.deadline,
            poll.isWeighted,
            poll.isMultipleChoice,
            poll.isActive,
            poll.options
        );
    }

    function hasVoted(uint256 _pollId, address _voter) public view returns (bool) {
        return polls[_pollId].hasVoted[_voter];
    }

    function closePoll(uint256 _pollId) public {
        Poll storage poll = polls[_pollId];
        require(msg.sender == poll.creator || msg.sender == owner(), "Not authorized");
        poll.isActive = false;
    }

    // Function to withdraw any remaining tokens (only owner)
    function withdrawTokens(uint256 amount) public onlyOwner {
        require(rewardToken.transfer(owner(), amount), "Withdrawal failed");
    }
} 