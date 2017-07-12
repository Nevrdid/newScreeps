'use strict';

function existInArray(array, item) {
  for (var i in array) {
    if (array[i].role === item.role) {
      return true;
    }
  }
  return false;
}

Creep.prototype.handleSourcer = function() {
  this.setNextSpawn();
  this.spawnReplacement();
  let room = Game.rooms[this.room.name];
  let targetId = this.memory.routing.targetId;
  var source = Game.getObjectById(targetId);

  let target = source;
  let returnCode = this.harvest(source);
  if (returnCode != OK && returnCode != ERR_NOT_ENOUGH_RESOURCES) {
    this.log('harvest: ' + returnCode);
    return false;
  }

  this.buildContainer();

  if (!this.room.controller || !this.room.controller.my || this.room.controller.level >= 2) {
    this.spawnCarry();
  }

  if (this.inBase()) {
    if (!this.memory.link) {
      const links = this.pos.findInRangePropertyFilter(FIND_MY_STRUCTURES, 1, 'structureType', [STRUCTURE_LINK]);
      if (links.length > 0) {
        this.memory.link = links[0].id;
      }
    }

    let link = Game.getObjectById(this.memory.link);
    this.transfer(link, RESOURCE_ENERGY);
  }
};

Creep.prototype.spawnCarry = function() {
  if (this.memory.wait > 0) {
    this.memory.wait -= 1;
    return false;
  }

  var foundKey;
  for (let key of Object.keys(config.carry.sizes).sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); })) {
    if (Game.rooms[this.memory.base].energyCapacityAvailable < key) {
      break;
    }
    foundKey = key;
  }
  let carryCapacity = config.carry.sizes[foundKey][0] * CARRY_CAPACITY;

  var work_parts = 0;
  for (var part_i in this.body) {
    if (this.body[part_i].type === 'work') {
      work_parts++;
    }
  }

  let waitTime = carryCapacity / (HARVEST_POWER * work_parts);

  var spawn = {
    role: 'carry',
    routing: {
      targetRoom: this.memory.routing.targetRoom,
      targetId: this.memory.routing.targetId,
    }
  };

  let energyAtPosition = 0;
  var energies = this.pos.lookFor(LOOK_RESOURCES);
  for (let energy of energies) {
    energyAtPosition += energy.amount;
  }

  if (energyAtPosition > carryCapacity) {
    Game.rooms[this.memory.base].checkRoleToSpawn('carry', config.carry.maxPerTargetPerRoom, this.memory.routing.targetId, this.memory.routing.targetRoom);
    this.memory.wait = waitTime;
    return true;
  }

  let containers = this.pos.findInRange(FIND_STRUCTURES, 0, {
    filter: function(object) {
      if (object.structureType != STRUCTURE_CONTAINER) {
        return false;
      }
      return true;
    }
  });

  for (let container of containers) {
    energyAtPosition += _.sum(container.store);
  }

  if (energyAtPosition > carryCapacity) {
    Game.rooms[this.memory.base].checkRoleToSpawn('carry', config.carry.maxPerTargetPerRoom, this.memory.routing.targetId, this.memory.routing.targetRoom);
  }
  this.memory.wait = waitTime;
};
