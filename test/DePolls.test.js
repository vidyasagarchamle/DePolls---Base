const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DePolls", function () {
  let depolls;
  let token;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy token
    const Token = await ethers.getContractFactory("DePollsToken");
    token = await Token.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Deploy polls contract
    const DePolls = await ethers.getContractFactory("DePolls");
    depolls = await DePolls.deploy(tokenAddress);
    await depolls.waitForDeployment();
    const pollsAddress = await depolls.getAddress();

    // Transfer tokens to polls contract for rewards
    const amount = ethers.parseEther("1000");
    await token.transfer(pollsAddress, amount);
  });

  describe("Poll Creation", function () {
    it("Should create a new poll", async function () {
      const question = "What's your favorite color?";
      const options = ["Red", "Blue", "Green"];
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      await depolls.createPoll(question, options, deadline, false, false);
      
      const poll = await depolls.getPoll(0);
      expect(poll.question).to.equal(question);
      expect(poll.options.length).to.equal(options.length);
      expect(poll.isActive).to.be.true;
    });

    it("Should fail if deadline is in the past", async function () {
      const deadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      await expect(
        depolls.createPoll("Test", ["A", "B"], deadline, false, false)
      ).to.be.revertedWith("Deadline must be in future");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      const question = "Test Poll";
      const options = ["Option 1", "Option 2"];
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      await depolls.createPoll(question, options, deadline, false, false);
    });

    it("Should allow voting and receive rewards", async function () {
      const pollId = 0;
      const optionIndex = [0];
      
      await depolls.connect(addr1).vote(pollId, optionIndex);
      
      const poll = await depolls.getPoll(pollId);
      expect(poll.options[0].voteCount).to.equal(1);
      
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(ethers.parseEther("10")); // REWARD_AMOUNT
    });

    it("Should prevent double voting", async function () {
      const pollId = 0;
      
      await depolls.connect(addr1).vote(pollId, [0]);
      
      await expect(
        depolls.connect(addr1).vote(pollId, [1])
      ).to.be.revertedWith("Already voted");
    });

    it("Should handle multiple choice voting correctly", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await depolls.createPoll(
        "Multiple Choice Test",
        ["A", "B", "C"],
        deadline,
        false,
        true // isMultipleChoice
      );

      const pollId = 1;
      await depolls.connect(addr1).vote(pollId, [0, 1]);

      const poll = await depolls.getPoll(pollId);
      expect(poll.options[0].voteCount).to.equal(1);
      expect(poll.options[1].voteCount).to.equal(1);
    });
  });

  describe("Poll Management", function () {
    it("Should allow owner to close poll", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await depolls.createPoll("Test", ["A", "B"], deadline, false, false);
      
      await depolls.closePoll(0);
      
      const poll = await depolls.getPoll(0);
      expect(poll.isActive).to.be.false;
    });

    it("Should prevent non-owners from closing polls", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await depolls.createPoll("Test", ["A", "B"], deadline, false, false);
      
      await expect(
        depolls.connect(addr1).closePoll(0)
      ).to.be.revertedWith("Not authorized");
    });
  });
}); 