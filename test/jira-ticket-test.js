const Helper = require('hubot-test-helper');
const chai = require('chai');

const expect = chai.expect;

const helper = new Helper('../src/jira-ticket.js');

describe('jira-ticket', () => {
	beforeEach(() => {
		this.room = helper.createRoom();
	});

	afterEach(() => {
		this.room.destroy();
	});

	it('responds to hello', () => {
		return this.room.user.say('alice', '@hubot hello').then(() => {
			expect(this.room.messages).to.eql([
				['alice', '@hubot hello'],
				['hubot', '@alice hello!']
			]);
		});
	});

	it('hears orly', () => {
		return this.room.user.say('bob', 'just wanted to say orly').then(() => {
			expect(this.room.messages).to.eql([
				['bob', 'just wanted to say orly']
				['hubot', 'yarly']
			]);
		});
	});
});
