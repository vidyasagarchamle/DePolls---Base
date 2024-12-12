// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DePolls is ReentrancyGuard {
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
        bool isActive;
        bool hasWhitelist;
        address rewardToken;
        uint256 rewardAmount;
        mapping(address => bool) hasVoted;
        mapping(address => bool) isWhitelisted;
        address[] voters;
    }

    uint256 public pollCount;
    mapping(uint256 => Poll) public polls;

    event PollCreated(
        uint256 indexed pollId,
        address indexed creator,
        string question,
        uint256 deadline,
        bool isWeighted,
        bool isMultipleChoice,
        bool hasWhitelist,
        address rewardToken,
        uint256 rewardAmount
    );
    event Voted(uint256 indexed pollId, address indexed voter, uint256[] optionIndices);
    event PollClosed(uint256 indexed pollId);
    event WhitelistUpdated(uint256 indexed pollId, address[] voters, bool isAdded);
    event RewardClaimed(uint256 indexed pollId, address indexed voter, uint256 amount);

    modifier onlyCreator(uint256 _pollId) {
        require(polls[_pollId].creator == msg.sender, "Not poll creator");
        _;
    }

    modifier pollExists(uint256 _pollId) {
        require(_pollId < pollCount, "Poll does not exist");
        _;
    }

    modifier pollActive(uint256 _pollId) {
        require(polls[_pollId].isActive, "Poll is not active");
        require(block.timestamp < polls[_pollId].deadline, "Poll has ended");
        _;
    }

    function createPoll(
        string memory _question,
        string[] memory _options,
        uint256 _deadline,
        bool _isWeighted,
        bool _isMultipleChoice,
        bool _hasWhitelist,
        address _rewardToken,
        uint256 _rewardAmount
    ) external returns (uint256) {
        require(_options.length >= 2 && _options.length <= 5, "Invalid number of options");
        require(_deadline > block.timestamp, "Invalid deadline");
        require(_rewardAmount == 0 || _rewardToken != address(0), "Invalid reward configuration");

        if (_rewardAmount > 0) {
            require(
                IERC20(_rewardToken).allowance(msg.sender, address(this)) >= _rewardAmount * 1000,
                "Insufficient reward token allowance"
            );
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
        newPoll.hasWhitelist = _hasWhitelist;
        newPoll.rewardToken = _rewardToken;
        newPoll.rewardAmount = _rewardAmount;

        for (uint i = 0; i < _options.length; i++) {
            newPoll.options.push(Option({
                text: _options[i],
                voteCount: 0
            }));
        }

        emit PollCreated(
            pollId,
            msg.sender,
            _question,
            _deadline,
            _isWeighted,
            _isMultipleChoice,
            _hasWhitelist,
            _rewardToken,
            _rewardAmount
        );

        return pollId;
    }

    function updateWhitelist(uint256 _pollId, address[] calldata _voters, bool _isAdded) 
        external 
        pollExists(_pollId)
        onlyCreator(_pollId)
    {
        require(polls[_pollId].hasWhitelist, "Poll does not use whitelist");
        
        for (uint i = 0; i < _voters.length; i++) {
            polls[_pollId].isWhitelisted[_voters[i]] = _isAdded;
        }

        emit WhitelistUpdated(_pollId, _voters, _isAdded);
    }

    function vote(uint256 _pollId, uint256[] calldata _optionIndices) 
        external 
        pollExists(_pollId)
        pollActive(_pollId)
        nonReentrant
    {
        Poll storage poll = polls[_pollId];
        require(!poll.hasVoted[msg.sender], "Already voted");
        require(_optionIndices.length > 0, "Must vote for at least one option");
        
        if (!poll.isMultipleChoice) {
            require(_optionIndices.length == 1, "Can only vote for one option");
        }

        if (poll.hasWhitelist) {
            require(poll.isWhitelisted[msg.sender], "Not whitelisted");
        }

        for (uint i = 0; i < _optionIndices.length; i++) {
            require(_optionIndices[i] < poll.options.length, "Invalid option index");
            poll.options[_optionIndices[i]].voteCount++;
        }

        poll.hasVoted[msg.sender] = true;
        poll.voters.push(msg.sender);

        emit Voted(_pollId, msg.sender, _optionIndices);
    }

    function closePoll(uint256 _pollId) 
        external 
        pollExists(_pollId)
        onlyCreator(_pollId)
    {
        require(polls[_pollId].isActive, "Poll already closed");
        polls[_pollId].isActive = false;
        emit PollClosed(_pollId);
    }

    function claimReward(uint256 _pollId) 
        external 
        pollExists(_pollId)
        nonReentrant
    {
        Poll storage poll = polls[_pollId];
        require(poll.hasVoted[msg.sender], "Haven't voted in this poll");
        require(poll.rewardAmount > 0, "No reward for this poll");
        require(poll.rewardToken != address(0), "No reward token set");
        
        uint256 rewardAmount = poll.rewardAmount;
        require(
            IERC20(poll.rewardToken).transferFrom(poll.creator, msg.sender, rewardAmount),
            "Reward transfer failed"
        );

        emit RewardClaimed(_pollId, msg.sender, rewardAmount);
    }

    // View functions
    function getPoll(uint256 _pollId) external view returns (
        uint256 id,
        address creator,
        string memory question,
        Option[] memory options,
        uint256 deadline,
        bool isWeighted,
        bool isMultipleChoice,
        bool isActive,
        bool hasWhitelist,
        address rewardToken,
        uint256 rewardAmount
    ) {
        require(_pollId < pollCount, "Poll does not exist");
        Poll storage poll = polls[_pollId];
        return (
            poll.id,
            poll.creator,
            poll.question,
            poll.options,
            poll.deadline,
            poll.isWeighted,
            poll.isMultipleChoice,
            poll.isActive,
            poll.hasWhitelist,
            poll.rewardToken,
            poll.rewardAmount
        );
    }

    function getVoters(uint256 _pollId) external view returns (address[] memory) {
        require(_pollId < pollCount, "Poll does not exist");
        require(msg.sender == polls[_pollId].creator, "Only creator can view voters");
        return polls[_pollId].voters;
    }

    function hasVoted(uint256 _pollId, address _voter) external view returns (bool) {
        require(_pollId < pollCount, "Poll does not exist");
        return polls[_pollId].hasVoted[_voter];
    }

    function isWhitelisted(uint256 _pollId, address _voter) external view returns (bool) {
        require(_pollId < pollCount, "Poll does not exist");
        if (!polls[_pollId].hasWhitelist) return true;
        return polls[_pollId].isWhitelisted[_voter];
    }
} 