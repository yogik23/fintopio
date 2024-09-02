const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { DateTime } = require('luxon');

const timeWait = new Map()
const keyTime = 'timeAuth'

class Fintopio {
  constructor() {
    this.baseUrl = 'https://fintopio-tg.fintopio.com/api';
    this.headers = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language':
        'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
      Referer: 'https://fintopio-tg.fintopio.com/',
      'Sec-Ch-Ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'Sec-Ch-Ua-Mobile': '?1',
      'Sec-Ch-Ua-Platform': '"Android"',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36',
    };
  }

  log(msg) {
    console.log(`[*] ${msg}`);
  }

  async waitWithCountdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`===== Waiting ${i} seconds to continue =====`); 
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log('');
  }

  async auth(userData) {
    const url = `${this.baseUrl}/auth/telegram`;
    const headers = { ...this.headers, Webapp: 'true' };

    try {
      const response = await axios.get(`${url}?${userData}`, { headers });
      return response.data.token;
    } catch (error) {
      this.log(`Error during authentication: ${error.message}`.red); 
      return null;
    }
  }

  async getProfile(token) {
    const url = `${this.baseUrl}/referrals/data`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      Webapp: 'false, true',
    };

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      this.log(`Error getting profile information: ${error.message}`.red); 
      return null;
    }
  }

  async checkInDaily(token) {
    const url = `${this.baseUrl}/daily-checkins`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(url, {}, { headers });
      this.log('Daily check-in successful!'.green); 
    } catch (error) {
      this.log(`Error during daily check-in: ${error.message}`.red); 
    }
  }

  async checkTask(token, id) {
    if (!id) {
      this.log(`Invalid ID [ ${id} ] ! ${error.message}`.red); 
      return;
    }
    const url = `${this.baseUrl}/hold/tasks/${id}/verify`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(url, {}, { headers });
      return response?.status === 'completed' ? 1 : 0;
    } catch (error) {
      this.log(`Error during daily check-in: ${error.message}`.red); 
    }
  }

  async claimQuest(token, quest) {
    if (!quest?.id) {
      this.log(`Invalid ID [ ${quest?.id} ] ! ${error.message}`.red); 
      return;
    }
    const url =
      quest?.status === 'available'
        ? `${this.baseUrl}/hold/tasks/${quest?.id}/start`
        : `${this.baseUrl}/hold/tasks/${quest?.id}/claim`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(url, {}, { headers });
      if (response?.data?.status === 'in-progress') {
        return await this.checkTask(token, quest?.id);
      } else if (response?.data?.status === 'completed') {
        return 1
      } else {
        this.log(`Quest is verifying - status: ${response?.data?.status}`.yellow); 
      }
    } catch (error) {
    }
  }

  async doQuest(token) {
    const url = `${this.baseUrl}/hold/tasks`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      path:'/api/hold/tasks',
      'authority':'fintopio-tg.fintopio.com'

    };

    try {
      const response = await axios.get(url, { headers });
      const listQuest = response?.data?.tasks;
      if (!listQuest.length) return;

      for await (const quest of listQuest) {
        
        const { id } = quest;
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(
          `${colors.magenta(`[*]`)}` +
            colors.yellow(` Quest : ${colors.white(id)} `) +
            colors.red('Working... '), 
        );
        const isFinish = await this.claimQuest(token, quest);
        readline.cursorTo(process.stdout, 0);
        if (isFinish) {
          process.stdout.write(
            `${colors.magenta(`[*]`)}` +
              colors.yellow(` Quest : ${colors.white(id)} `) +
              colors.green('Done!                  '), 
          );
        } else {
          process.stdout.write(
            `${colors.magenta(`[*]`)}` +
              colors.yellow(` Quest : ${colors.white(id)} `) +
              colors.red('Failed!                  '), 
          );
        }
        console.log();
      }
    } catch (error) {
      this.log(`Error getting quest: ${error.message}`.red); 
    }
  }

  async getFarmingState(token) {
    const url = `${this.baseUrl}/farming/state`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      this.log(`Error getting farming status: ${error.message}`.red); 
      return null;
    }
  }

  async startFarming(token) {
    const url = `${this.baseUrl}/farming/farm`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(url, {}, { headers });
      const finishTimestamp = response.data.timings.finish;

      if (finishTimestamp) {
        const finishTime = DateTime.fromMillis(finishTimestamp).toLocaleString(
          DateTime.DATETIME_FULL,
        );
        this.log(`Starting farm...`.yellow); 
        this.log(`Farm completion time: ${finishTime}`.green); 
      } else {
        this.log('No completion time.'.yellow); 
      }
    } catch (error) {
      this.log(`Error starting farming: ${error.message}`.red); 
    }
  }

  async claimFarming(token) {
    const url = `${this.baseUrl}/farming/claim`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const res = await axios.post(url, {}, { headers });
      this.log('Farm claim successful!'.green); 
    } catch (error) {
      this.log(`Error claiming: ${error.message}`.red); 
    }
  }

  extractFirstName(userData) {
    try {
      const userPart = userData.match(/user=([^&]*)/)[1];
      const decodedUserPart = decodeURIComponent(userPart);
      const userObj = JSON.parse(decodedUserPart);
      return userObj.first_name || 'Unknown';
    } catch (error) {
      this.log(`Error extracting first_name: ${error.message}`.red); 
      return 'Unknown';
    }
  }

  calculateWaitTime(firstAccountFinishTime) {
    if (!firstAccountFinishTime) return null;

    const now = Date.now()
    const timeSubtract = firstAccountFinishTime - now
    if(timeSubtract > 0){
      return timeSubtract
    }
  }

  async main() {
    while (true) {
      const dataFile = path.join(__dirname, 'data.txt');
      const data = await fs.readFile(dataFile, 'utf8');
      const users = data.split('\n').filter(Boolean);

      let firstAccountFinishTime = null;
      let time = []

      for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        const first_name = this.extractFirstName(userData);
        console.log(
          `========== Account ${i + 1} | ${first_name.green} ==========`, 
        );
        const token = await this.auth(userData);
        if (token) {
          this.log(`Login successful!`.green); 
          const profile = await this.getProfile(token);
          if (profile) {
            const balance = profile.balance;
            this.log(`Balance: ${balance.green}`);
            await this.checkInDaily(token);
            await this.doQuest(token);

            const farmingState = await this.getFarmingState(token);
            firstAccountFinishTime = farmingState.timings.finish;
            time.push(firstAccountFinishTime)
            timeWait.set(keyTime,time)
            if (farmingState) {
              if (farmingState.state === 'idling') {
                await this.startFarming(token);
              } else if (farmingState.state === 'farming') {
                const finishTimestamp = farmingState.timings.finish;
                if (finishTimestamp) {
                  const finishTime = DateTime.fromMillis(
                    finishTimestamp,
                  ).toLocaleString(DateTime.DATETIME_FULL);
                  this.log(`Farm completion time: ${finishTime}`.green); 

                  if (i === 0) {
                    firstAccountFinishTime = finishTimestamp;
                  }

                  const currentTime = DateTime.now().toMillis();
                  if (currentTime > finishTimestamp) {
                    await this.claimFarming(token);
                    await this.startFarming(token);
                  }
                }
              } else if (farmingState.state === 'farmed') {
                await this.claimFarming(token);
                await this.startFarming(token);
              }
            }
          }
        }
      }

      const listTime = timeWait.get(keyTime)
      const timeMin = Math.min(...listTime)
      const waitTime = this.calculateWaitTime(timeMin);
      if (waitTime && waitTime > 0) {
        await this.waitWithCountdown(Math.floor(waitTime / 1000));
      } else {
        this.log(
          'No valid waiting time, continuing the loop immediately.'
            .yellow,
        );
        await this.waitWithCountdown(5);
      }
    }
  }
}

if (require.main === module) {
  const fintopio = new Fintopio();
  fintopio.main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}