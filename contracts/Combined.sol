// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract DePolls is EIP712 {
    using ECDSA for bytes32;

    struct Poll {
        string question;
        address creator;
        uint256 deadline;
        bool isMultipleChoice;
        bool isActive;
        bool hasWhitelist;
        mapping(uint256 => Option) options;
        uint256 optionCount;
        mapping(address => bool) hasVoted;
        mapping(address => bool) isWhitelisted;
        address[] voters;
    }

    struct Option {
        string text;
        uint256 voteCount;
    }

    struct PollView {
        string question;
        address creator;
        uint256 deadline;
        bool isMultipleChoice;
        bool isActive;
        bool hasWhitelist;
        Option[] options;
    }

    mapping(uint256 => Poll) public polls;
    uint256 public pollCount;

    // EIP-712 type hashes
    bytes32 private constant VOTE_TYPEHASH = keccak256("Vote(uint256 pollId,uint256[] optionIndexes,uint256 nonce)");
    mapping(address => uint256) public nonces;

    event PollCreated(uint256 indexed pollId, address indexed creator);
    event Voted(uint256 indexed pollId, address indexed voter, uint256[] optionIndexes);
    event PollClosed(uint256 indexed pollId);

    constructor() EIP712("DePolls", "1") {}

    function createPoll(
        string memory _question,
        string[] memory _options,
        uint256 _deadline,
        bool _isMultipleChoice,
        bool _hasWhitelist,
        address[] memory _whitelistedAddresses
    ) external {
        require(bytes(_question).length > 0, "Question cannot be empty");
        require(_options.length >= 2, "At least 2 options required");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        uint256 pollId = pollCount++;
        Poll storage poll = polls[pollId];
        poll.question = _question;
        poll.creator = msg.sender;
        poll.deadline = _deadline;
        poll.isMultipleChoice = _isMultipleChoice;
        poll.isActive = true;
        poll.hasWhitelist = _hasWhitelist;
        poll.optionCount = _options.length;

        for (uint256 i = 0; i < _options.length; i++) {
            poll.options[i] = Option(_options[i], 0);
        }

        if (_hasWhitelist) {
            for (uint256 i = 0; i < _whitelistedAddresses.length; i++) {
                poll.isWhitelisted[_whitelistedAddresses[i]] = true;
            }
        }

        emit PollCreated(pollId, msg.sender);
    }

    function vote(uint256 _pollId, uint256[] calldata _optionIndexes) external {
        _vote(_pollId, _optionIndexes, msg.sender);
    }

    function metaVote(
        uint256 _pollId,
        uint256[] calldata _optionIndexes,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        bytes32 structHash = keccak256(abi.encode(
            VOTE_TYPEHASH,
            _pollId,
            keccak256(abi.encodePacked(_optionIndexes)),
            nonces[msg.sender]++
        ));

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, v, r, s);
        
        _vote(_pollId, _optionIndexes, signer);
    }

    function _vote(uint256 _pollId, uint256[] calldata _optionIndexes, address voter) internal {
        Poll storage poll = polls[_pollId];
        
        require(poll.isActive, "Poll is not active");
        require(block.timestamp <= poll.deadline, "Poll has ended");
        require(!poll.hasVoted[voter], "Already voted");
        require(_optionIndexes.length > 0, "Must vote for at least one option");
        require(!poll.isMultipleChoice ? _optionIndexes.length == 1 : true, "Multiple choices not allowed");
        
        if (poll.hasWhitelist) {
            require(poll.isWhitelisted[voter], "Not whitelisted");
        }

        for (uint256 i = 0; i < _optionIndexes.length; i++) {
            require(_optionIndexes[i] < poll.optionCount, "Invalid option index");
            poll.options[_optionIndexes[i]].voteCount++;
        }

        poll.hasVoted[voter] = true;
        poll.voters.push(voter);

        emit Voted(_pollId, voter, _optionIndexes);
    }

    function closePoll(uint256 _pollId) external {
        Poll storage poll = polls[_pollId];
        require(msg.sender == poll.creator, "Only creator can close poll");
        require(poll.isActive, "Poll already closed");
        
        poll.isActive = false;
        emit PollClosed(_pollId);
    }

    // View functions
    function getPollOptions(uint256 _pollId) external view returns (Option[] memory) {
        Poll storage poll = polls[_pollId];
        Option[] memory options = new Option[](poll.optionCount);
        
        for (uint256 i = 0; i < poll.optionCount; i++) {
            options[i] = poll.options[i];
        }
        
        return options;
    }

    function hasVoted(uint256 _pollId, address _voter) external view returns (bool) {
        return polls[_pollId].hasVoted[_voter];
    }

    function isWhitelisted(uint256 _pollId, address _voter) external view returns (bool) {
        return !polls[_pollId].hasWhitelist || polls[_pollId].isWhitelisted[_voter];
    }

    function getVoters(uint256 _pollId) external view returns (address[] memory) {
        return polls[_pollId].voters;
    }

    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getPollData(uint256 _pollId) external view returns (
        string memory question,
        address creator,
        uint256 deadline,
        bool isMultipleChoice,
        bool isActive,
        bool hasWhitelist,
        uint256 optionCount
    ) {
        Poll storage poll = polls[_pollId];
        return (
            poll.question,
            poll.creator,
            poll.deadline,
            poll.isMultipleChoice,
            poll.isActive,
            poll.hasWhitelist,
            poll.optionCount
        );
    }
} 