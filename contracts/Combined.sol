// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DePollsToken is ERC20, Ownable {
    constructor() ERC20("DePolls Token", "DPOLL") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

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
        bool isDeleted;
    }

    uint256 public pollCount;
    uint256 public activePollCount;
    mapping(uint256 => Poll) public polls;
    DePollsToken public rewardToken;
    uint256 public constant REWARD_AMOUNT = 10 * 10**18; // 10 tokens

    event PollCreated(uint256 indexed pollId, address creator, string question);
    event Voted(uint256 indexed pollId, address voter, uint256[] optionIndices);
    event PollDeleted(uint256 indexed pollId);
    event PollClosed(uint256 indexed pollId);

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
        require(bytes(_question).length > 0, "Question cannot be empty");
        require(_options.length >= 2 && _options.length <= 5, "Must have 2-5 options");
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(_deadline <= block.timestamp + 30 days, "Deadline too far in future");

        for (uint i = 0; i < _options.length; i++) {
            require(bytes(_options[i]).length > 0, "Option cannot be empty");
        }

        uint256 pollId = pollCount++;
        Poll storage newPoll = polls[pollId];
        newPoll.id = pollId;
        newPoll.creator = msg.sender;
        newPoll.question = _question;
        newPoll.deadline = _deadline;
        newPoll.isWeighted = _isWeighted;
        newPoll.isMultipleChoice = _isMultipleChoice;
        newPoll.isActive = true;
        newPoll.isDeleted = false;

        for (uint i = 0; i < _options.length; i++) {
            newPoll.options.push(Option({
                text: _options[i],
                voteCount: 0
            }));
        }

        activePollCount++;
        emit PollCreated(pollId, msg.sender, _question);
        return pollId;
    }

    function vote(uint256 _pollId, uint256[] memory _optionIndices) public {
        Poll storage poll = polls[_pollId];
        require(!poll.isDeleted, "Poll has been deleted");
        require(poll.isActive, "Poll is not active");
        require(block.timestamp < poll.deadline, "Poll has ended");
        require(!poll.hasVoted[msg.sender], "Already voted");
        require(msg.sender != poll.creator, "Cannot vote on own poll");
        require(_optionIndices.length > 0, "Must vote for at least one option");
        
        if (!poll.isMultipleChoice) {
            require(_optionIndices.length == 1, "Can only vote for one option");
        }

        for (uint i = 0; i < _optionIndices.length; i++) {
            require(_optionIndices[i] < poll.options.length, "Invalid option");
            poll.options[_optionIndices[i]].voteCount += 1;
        }

        poll.hasVoted[msg.sender] = true;
        poll.votes[msg.sender] = _optionIndices;

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
        require(!poll.isDeleted, "Poll has been deleted");
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
        Poll storage poll = polls[_pollId];
        require(!poll.isDeleted, "Poll has been deleted");
        return poll.hasVoted[_voter];
    }

    function closePoll(uint256 _pollId) public {
        Poll storage poll = polls[_pollId];
        require(!poll.isDeleted, "Poll has been deleted");
        require(msg.sender == poll.creator || msg.sender == owner(), "Not authorized");
        require(poll.isActive, "Poll already closed");
        
        poll.isActive = false;
        if (activePollCount > 0) {
            activePollCount--;
        }
        
        emit PollClosed(_pollId);
    }

    function withdrawTokens(uint256 amount) public onlyOwner {
        require(rewardToken.transfer(owner(), amount), "Withdrawal failed");
    }
} 