/* 
############################################################################################
####		Created & Developed by João Gabriel Corrêa da Silva (All Rights Reserved)				####
####	    https://www.linkedin.com/in/jo%C3%A3o-gabriel-corr%C3%AAa-da-silva/	          ####
############################################################################################
*/

// Algoritmo de Colônia de Formigas para TSP em JavaScript
class ACO {
  constructor(
    cities,
    ants,
    alpha = 1,
    beta = 2,
    evaporation = 0.5,
    iterations = 100
  ) {
    this.cities = cities; // Matriz de distâncias entre as cidades
    this.numCities = cities.length;
    this.numAnts = ants;
    this.alpha = alpha; // Peso da feromona
    this.beta = beta; // Peso da heurística
    this.evaporation = evaporation; // Taxa de evaporação
    this.iterations = iterations; // Número de iterações
    this.pheromone = Array.from({ length: this.numCities }, () =>
      Array(this.numCities).fill(1)
    ); // Feromônio inicial
  }

  // Função para encontrar a próxima cidade
  selectNextCity(currentCity, visited) {
    const probabilities = [];
    let sum = 0;

    for (let nextCity = 0; nextCity < this.numCities; nextCity++) {
      if (!visited[nextCity]) {
        const pheromoneLevel = Math.pow(
          this.pheromone[currentCity][nextCity],
          this.alpha
        );
        const heuristicValue = Math.pow(
          1 / this.cities[currentCity][nextCity],
          this.beta
        );
        probabilities[nextCity] = pheromoneLevel * heuristicValue;
        sum += probabilities[nextCity];
      } else {
        probabilities[nextCity] = 0;
      }
    }

    const random = Math.random() * sum;
    let cumulative = 0;

    for (let city = 0; city < this.numCities; city++) {
      cumulative += probabilities[city];
      if (random <= cumulative) {
        return city;
      }
    }

    return -1; // Caso de erro
  }

  // Atualizar feromônios
  updatePheromones(paths) {
    // Evaporação
    for (let i = 0; i < this.numCities; i++) {
      for (let j = 0; j < this.numCities; j++) {
        this.pheromone[i][j] *= 1 - this.evaporation;
      }
    }

    // Adicionar feromônios baseados nos caminhos
    for (const path of paths) {
      const { route, distance } = path;
      const contribution = 1 / distance;
      for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        this.pheromone[from][to] += contribution;
        this.pheromone[to][from] += contribution;
      }
    }
  }

  // Executar o algoritmo
  run() {
    let bestDistance = Infinity;
    let bestRoute = [];

    for (let iter = 0; iter < this.iterations; iter++) {
      const paths = [];

      for (let ant = 0; ant < this.numAnts; ant++) {
        let currentCity = Math.floor(Math.random() * this.numCities);
        const visited = Array(this.numCities).fill(false);
        const route = [currentCity];
        visited[currentCity] = true;

        while (route.length < this.numCities) {
          const nextCity = this.selectNextCity(currentCity, visited);
          route.push(nextCity);
          visited[nextCity] = true;
          currentCity = nextCity;
        }

        // Voltar para a cidade inicial
        route.push(route[0]);

        // Calcular a distância total
        const distance = route.reduce((sum, city, index) => {
          if (index === route.length - 1) return sum;
          return sum + this.cities[city][route[index + 1]];
        }, 0);

        paths.push({ route, distance });

        if (distance < bestDistance) {
          bestDistance = distance;
          bestRoute = route;
        }
      }

      this.updatePheromones(paths);

      console.log(
        `Iteração ${iter + 1}: Melhor distância até agora = ${bestDistance}`
      );
    }

    return { bestRoute, bestDistance };
  }

  // Função para desenhar rotas no canvas
  drawRoutes(bestRoute, coordinates, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) {
      console.error("Canvas não encontrado ou não suportado.");
      return;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar cidades
    ctx.fillStyle = "blue";
    coordinates.forEach(([x, y], index) => {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(index, x + 8, y - 8);
    });

    // Desenhar rota
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < bestRoute.length; i++) {
      const [x, y] = coordinates[bestRoute[i]];
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }
}

class ACO_VRP_Old extends ACO {
  constructor(
    cities,
    demands,
    vehicleCapacities,
    depots,
    ants,
    alpha = 1,
    beta = 2,
    evaporation = 0.5,
    iterations = 100
  ) {
    super(cities, ants, alpha, beta, evaporation, iterations);
    this.demands = demands;
    this.vehicleCapacities = vehicleCapacities;
    this.depots = depots; // Lista de depósitos
  }

  runMultiDepotVRP() {
    if (
      !Array.isArray(this.vehicleCapacities) ||
      this.vehicleCapacities.length === 0
    ) {
      throw new Error(
        "As capacidades dos veículos (vehicleCapacities) devem ser um array válido com pelo menos um elemento."
      );
    }
    let bestDistance = Infinity;
    let bestRoutes = [];


    for (let iter = 0; iter < this.iterations; iter++) {
      const allRoutes = Array.from(
        { length: this.vehicleCapacities.length },
        () => []
      );
      const visited = Array(this.numCities).fill(false);
      this.depots.forEach((depot) => (visited[depot] = true)); // Marcar depósitos como visitados
      let totalDistance = 0;

      for (
        let vehicle = 0;
        vehicle < this.vehicleCapacities.length;
        vehicle++
      ) {
        let capacity = this.vehicleCapacities[vehicle];
        const depot = this.depots[vehicle % this.depots.length]; // Cada veículo começa em um depósito
        let currentCity = depot;
        const route = [currentCity];

        while (route.length < this.numCities) {
          const nextCity = this.selectNextCityVRP(
            currentCity,
            visited,
            capacity
          );
          if (nextCity === -1) break;

          route.push(nextCity);
          visited[nextCity] = true;
          capacity -= this.demands[nextCity];
          currentCity = nextCity;
        }

        route.push(depot); // Voltar ao depósito
        allRoutes[vehicle] = route;

        const distance = route.reduce((sum, city, index) => {
          if (index === route.length - 1) return sum;
          return sum + this.cities[city][route[index + 1]];
        }, 0);

        totalDistance += distance;
      }

      // Verificar cidades não atendidas e atribuí-las manualmente
      for (let city = 1; city < this.numCities; city++) {
        if (!visited[city]) {
          console.warn(`A cidade ${city} não foi atendida.`);
          let assigned = false;

          for (
            let vehicle = 0;
            vehicle < this.vehicleCapacities.length;
            vehicle++
          ) {
            const remainingCapacity =
              this.vehicleCapacities[vehicle] -
              allRoutes[vehicle]
                .slice(1, -1)
                .reduce((sum, c) => sum + this.demands[c], 0);

            if (remainingCapacity >= this.demands[city]) {
              const depot = this.depots[vehicle % this.depots.length];
              allRoutes[vehicle].splice(-1, 0, city); // Insere antes de retornar ao depósito
              totalDistance += 2 * this.cities[depot][city];
              assigned = true;
              break;
            }
          }

          if (!assigned) {
            console.error(
              `A cidade ${city} não pode ser atendida por nenhum veículo disponível.`
            );
          }
        }
      }

      if (totalDistance < bestDistance) {
        bestDistance = totalDistance;
        bestRoutes = allRoutes;
      }

      this.updatePheromonesVRP(allRoutes, totalDistance);
    }

    return { bestRoutes, bestDistance };
  }

  // Atualizar feromônios para o problema de roteamento de veículos
  updatePheromonesVRP(allRoutes, totalDistance) {
    // Evaporação dos feromônios
    for (let i = 0; i < this.numCities; i++) {
      for (let j = 0; j < this.numCities; j++) {
        this.pheromone[i][j] *= 1 - this.evaporation;
      }
    }

    // Adicionar feromônios com base nas rotas
    const contribution = 1 / totalDistance; // Contribuição proporcional ao custo total
    for (const route of allRoutes) {
      for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        this.pheromone[from][to] += contribution;
        this.pheromone[to][from] += contribution;
      }
    }
  }

  // Selecionar próxima cidade respeitando capacidade e depósitos
  selectNextCityVRP(currentCity, visited, capacity) {
    const probabilities = [];
    let sum = 0;

    for (let nextCity = 0; nextCity < this.numCities; nextCity++) {
      if (!visited[nextCity] && this.demands[nextCity] <= capacity) {
        const pheromoneLevel = Math.pow(
          this.pheromone[currentCity][nextCity],
          this.alpha
        );
        const heuristicValue = Math.pow(
          1 / this.cities[currentCity][nextCity],
          this.beta
        );
        probabilities[nextCity] = pheromoneLevel * heuristicValue;
        sum += probabilities[nextCity];
      } else {
        probabilities[nextCity] = 0;
      }
    }

    const random = Math.random() * sum;
    let cumulative = 0;

    for (let city = 0; city < this.numCities; city++) {
      cumulative += probabilities[city];
      if (random <= cumulative) {
        return city;
      }
    }

    return -1; // Nenhuma cidade disponível
  }

  drawVehicleRoutes(routes, coordinates, demands, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) {
      console.error("Canvas não encontrado ou não suportado.");
      return;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Paleta de cores para cada veículo
    const colors = ["red", "blue", "green", "purple", "orange"];

    // Desenhar cidades e suas demandas
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    coordinates.forEach(([x, y], index) => {
      // Desenhar a cidade como um círculo
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = demands[index] > 0 ? "black" : "gray"; // Cinza para depósitos
      ctx.fill();

      // Exibir o índice e a demanda ao lado da cidade
      ctx.fillStyle = "black";
      ctx.fillText(`C${index} (D:${demands[index]})`, x + 8, y - 8);
    });

    // Desenhar rotas para cada veículo
    routes.forEach((route, vehicleIndex) => {
      const color = colors[vehicleIndex % colors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      for (let i = 0; i < route.length; i++) {
        const [x, y] = coordinates[route[i]];
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();

      // Exibir o número do veículo próximo ao início da rota
      const [startX, startY] = coordinates[route[0]];
      ctx.fillStyle = color;
      ctx.fillText(`V${vehicleIndex + 1}`, startX - 20, startY - 20);
    });
  }
}

class ACO_VRP_Old_New extends ACO {
  constructor(
    cities, // Matriz de distâncias entre os pontos da grade
    demands,
    vehicleCapacities,
    depots,
    ants,
    alpha = 1,
    beta = 2,
    evaporation = 0.5,
    iterations = 100,
    grid, // Grade para caminhos (opcional)
    indexes
  ) {
    super(cities, ants, alpha, beta, evaporation, iterations);
    this.demands = demands;
    this.vehicleCapacities = vehicleCapacities;
    this.depots = depots;
    this.grid = grid; // Matriz de células para cálculo na grade
    this.indexes = indexes;
  }

  findPathAStar(grid, start, end) {
    const rows = grid.length;
    const cols = grid[0].length;

    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();

    const gScore = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));
    const fScore = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));

    const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    gScore[start.x][start.y] = 0;
    fScore[start.x][start.y] = heuristic(start, end);
    openSet.push({ ...start, f: fScore[start.x][start.y] });

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      if (current.x === end.x && current.y === end.y) {
        const path = [];
        let temp = `${end.x},${end.y}`;
        while (temp) {
          const [x, y] = temp.split(',').map(Number);
          path.unshift({ x, y });
          temp = cameFrom.get(temp);
        }
        return path;
      }

      closedSet.add(`${current.x},${current.y}`);

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const neighbor of neighbors) {
        if (
          neighbor.x < 0 ||
          neighbor.y < 0 ||
          neighbor.x >= rows ||
          neighbor.y >= cols ||
          closedSet.has(`${neighbor.x},${neighbor.y}`) ||
          grid[neighbor.x][neighbor.y].occupied
        ) {
          continue;
        }

        const tentativeGScore =
          gScore[current.x][current.y] + grid[neighbor.x][neighbor.y].cost;

        if (tentativeGScore < gScore[neighbor.x][neighbor.y]) {
          cameFrom.set(
            `${neighbor.x},${neighbor.y}`,
            `${current.x},${current.y}`
          );
          gScore[neighbor.x][neighbor.y] = tentativeGScore;
          fScore[neighbor.x][neighbor.y] =
            tentativeGScore + heuristic(neighbor, end);

          if (
            !openSet.find(
              (node) => node.x === neighbor.x && node.y === neighbor.y
            )
          ) {
            openSet.push({
              ...neighbor,
              f: fScore[neighbor.x][neighbor.y],
            });
          }
        }
      }
    }

    return null; // Sem caminho
  }

  selectNextCityVRP(currentCity, visited, capacity) {
    const probabilities = Array(this.numCities).fill(0);
    let sum = 0;

    for (let nextCity = 0; nextCity < this.numCities; nextCity++) {
      if(currentCity === nextCity) continue;
      if(this.depots.includes(nextCity)) continue;
      if (!visited[nextCity] && this.demands[nextCity] <= capacity) {

        const pheromoneLevel = Math.pow(
          this.pheromone[currentCity][nextCity],
          this.alpha
        );
        const heuristicValue = Math.pow(
          1 / this.cities[currentCity][nextCity],
          this.beta
        );
        probabilities[nextCity] = pheromoneLevel * heuristicValue;
        sum += probabilities[nextCity];
      } else {
        probabilities[nextCity] = 0;
      }
    }

    const random = Math.random() * sum;
    let cumulative = 0;

    for (let city = 0; city < this.numCities; city++) {
      if(currentCity === city) continue;
      if(this.depots.includes(city)) continue;
      cumulative += probabilities[city];
      if (random <= cumulative) {
        return city;
      }
    }

    return -1; // Nenhuma cidade disponível
  }

  findPositionByIndex(index = -1, grid = this.grid){
    if(index === -1) return { x: -1, y: -1 }; 
    if(this.indexes[index]) index = this.indexes[index];
    const rows = grid.length;
    const cols = grid[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if(grid[r][c].index === index) return { x: c, y: r }
      }
    }
    return { x: -1, y: -1 };
  }

  runMultiDepotVRP() {
    if (!Array.isArray(this.vehicleCapacities) || this.vehicleCapacities.length === 0) {
      throw new Error(
        "As capacidades dos veículos (vehicleCapacities) devem ser um array válido com pelo menos um elemento."
      );
    }
    let bestDistance = Infinity;
    let bestRoutes = [];
    let bestRealRoutes = [];

    for (let iter = 0; iter < this.iterations; iter++) {
      const allRoutes = Array.from({ length: this.vehicleCapacities.length }, () => []);
      const allRealRoutes = Array.from({ length: this.vehicleCapacities.length }, () => []);
      const visited = Array(this.numCities).fill(false);
      this.depots.forEach((depot) => (visited[depot] = true)); // Marcar depósitos como visitados
      let totalDistance = 0;

      for (let vehicle = 0; vehicle < this.vehicleCapacities.length; vehicle++) {
        let capacity = this.vehicleCapacities[vehicle];
        const depot = this.depots[vehicle % this.depots.length]; // Cada veículo começa em um depósito
        let currentCity = depot;
        let currentCityPosition = this.findPositionByIndex(depot);
        const route = [currentCity];
        const realRoute = [];//[this.indexes[currentCity]?? currentCity];

        while (route.length < this.numCities) {
          const nextCity = this.selectNextCityVRP(currentCity, visited, capacity);
          if (nextCity === -1) break;
          let nextCityPosition = this.findPositionByIndex(nextCity);

          const path = this.findPathAStar(
            this.grid,
            { x: currentCityPosition.x, y: currentCityPosition.y },
            { x: nextCityPosition.x, y: nextCityPosition.y }
          ).map(p=>this.grid[p.y][p.x].index);

          if (path) {
            realRoute.push(...path.map((p) => p));
            route.push(nextCity);
            visited[nextCity] = true;
            capacity -= this.demands[nextCity];
            currentCity = nextCity;
          } else {
            console.error(`Não foi possível encontrar um caminho de ${currentCity} para ${nextCity}.`);
            break;
          }
        }

        const retornPath = this.findPathAStar(
          this.grid,
          this.findPositionByIndex(route[route.length-1]),
          this.findPositionByIndex(depot)
        ).map(p=>this.grid[p.y][p.x].index);

        //route.push(depot); // Voltar ao depósito
        allRoutes[vehicle] = route;

        //realRoute.push(...retornPath.map((p) => p).slice(1)); // Voltar ao depósito
        allRealRoutes[vehicle] = realRoute;

        totalDistance += route.length; // Distância como o comprimento do caminho na grade
      }

      if (totalDistance < bestDistance) {
        bestDistance = totalDistance;
        bestRoutes = allRoutes;
        bestRealRoutes = allRealRoutes;
      }

      this.updatePheromonesVRP(allRoutes, totalDistance);
    }

    return { bestRoutes, bestDistance, bestRealRoutes };
  }

  // Atualizar feromônios para o problema de roteamento de veículos
  updatePheromonesVRP(allRoutes, totalDistance) {
    // Evaporação dos feromônios
    for (let i = 0; i < this.numCities; i++) {
      for (let j = 0; j < this.numCities; j++) {
        this.pheromone[i][j] *= 1 - this.evaporation;
      }
    }

    // Adicionar feromônios com base nas rotas
    const contribution = 1 / totalDistance; // Contribuição proporcional ao custo total
    for (const route of allRoutes) {
      for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        this.pheromone[from][to] += contribution;
        this.pheromone[to][from] += contribution;
      }
    }
  }
}

class ACO_VRP extends ACO {
  constructor(
    cities, // Matriz de distâncias entre os pontos da grade
    demands,
    vehicleCapacities,
    depots,
    ants,
    alpha = 1,
    beta = 2,
    evaporation = 0.5,
    iterations = 100,
    grid, // Grade para caminhos (opcional)
    indexes
  ) {
    super(cities, ants, alpha, beta, evaporation, iterations);
    this.demands = demands;
    this.vehicleCapacities = vehicleCapacities;
    this.depots = depots;
    this.grid = grid; // Matriz de células para cálculo na grade
    this.indexes = indexes;
  }

  findPathAStar(grid, start, end) {
    const rows = grid.length;
    const cols = grid[0].length;

    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();

    const gScore = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));
    const fScore = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));

    const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    gScore[start.x][start.y] = 0;
    fScore[start.x][start.y] = heuristic(start, end);
    openSet.push({ ...start, f: fScore[start.x][start.y] });

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      if (current.x === end.x && current.y === end.y) {
        const path = [];
        let temp = `${end.x},${end.y}`;
        while (temp) {
          const [x, y] = temp.split(',').map(Number);
          path.unshift({ x, y });
          temp = cameFrom.get(temp);
        }
        return path;
      }

      closedSet.add(`${current.x},${current.y}`);

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const neighbor of neighbors) {
        if (
          neighbor.x < 0 ||
          neighbor.y < 0 ||
          neighbor.x >= rows ||
          neighbor.y >= cols ||
          closedSet.has(`${neighbor.x},${neighbor.y}`) ||
          grid[neighbor.x][neighbor.y].occupied
        ) {
          continue;
        }

        const tentativeGScore =
          gScore[current.x][current.y] + grid[neighbor.x][neighbor.y].cost;

        if (tentativeGScore < gScore[neighbor.x][neighbor.y]) {
          cameFrom.set(
            `${neighbor.x},${neighbor.y}`,
            `${current.x},${current.y}`
          );
          gScore[neighbor.x][neighbor.y] = tentativeGScore;
          fScore[neighbor.x][neighbor.y] =
            tentativeGScore + heuristic(neighbor, end);

          if (
            !openSet.find(
              (node) => node.x === neighbor.x && node.y === neighbor.y
            )
          ) {
            openSet.push({
              ...neighbor,
              f: fScore[neighbor.x][neighbor.y],
            });
          }
        }
      }
    }

    return null; // Sem caminho
  }

  selectNextCityVRP(currentCity, visited, capacity) {
    const probabilities = Array(this.numCities).fill(0);
    let sum = 0;
  
    for (let nextCity = 0; nextCity < this.numCities; nextCity++) {
      if (visited[nextCity] || this.depots.includes(nextCity)) continue;
      if (this.demands[nextCity] > capacity) continue;
  
      const pheromoneLevel = Math.pow(
        this.pheromone[currentCity][nextCity],
        this.alpha
      );
      const heuristicValue = Math.pow(
        1 / this.cities[currentCity][nextCity],
        this.beta
      );
      probabilities[nextCity] = pheromoneLevel * heuristicValue;
      sum += probabilities[nextCity];
    }
  
    const random = Math.random() * sum;
    let cumulative = 0;
  
    for (let city = 0; city < this.numCities; city++) {
      if (visited[city] || this.depots.includes(city)) continue;
      cumulative += probabilities[city];
      if (random <= cumulative) {
        return city;
      }
    }
  
    return -1; // Nenhuma cidade disponível
  }

  findPositionByIndex(index = -1, grid = this.grid){
    if(index === -1) return { x: -1, y: -1 }; 
    if(this.indexes[index]) index = this.indexes[index];
    const rows = grid.length;
    const cols = grid[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if(grid[r][c].index === index) return { x: c, y: r }
      }
    }
    return { x: -1, y: -1 };
  }

  runMultiDepotVRP() {
    if (!Array.isArray(this.vehicleCapacities) || this.vehicleCapacities.length === 0) {
      throw new Error(
        "As capacidades dos veículos (vehicleCapacities) devem ser um array válido com pelo menos um elemento."
      );
    }
    let bestDistance = Infinity;
    let bestRoutes = [];
    let bestRealRoutes = [];
  
    for (let iter = 0; iter < this.iterations; iter++) {
      const allRoutes = Array.from({ length: this.vehicleCapacities.length }, () => []);
      const allRealRoutes = Array.from({ length: this.vehicleCapacities.length }, () => []);
      const visited = Array(this.numCities).fill(false);
      this.depots.forEach((depot) => (visited[depot] = true)); // Marcar depósitos como visitados
      let totalDistance = 0;
  
      for (let vehicle = 0; vehicle < this.vehicleCapacities.length; vehicle++) {
        let capacity = this.vehicleCapacities[vehicle];
        const depot = this.depots[vehicle % this.depots.length]; // Cada veículo começa em um depósito
        let currentCity = depot;
        let currentCityPosition = this.findPositionByIndex(depot);
        const route = [currentCity];
        const realRoute = []; // Caminho real na grade
  
        while (capacity > 0) {
          const nextCity = this.selectNextCityVRP(currentCity, visited, capacity);
          if (nextCity === -1) break; // Nenhuma cidade disponível para atender
          let nextCityPosition = this.findPositionByIndex(nextCity);
  
          const path = this.findPathAStar(
            this.grid,
            { x: currentCityPosition.x, y: currentCityPosition.y },
            { x: nextCityPosition.x, y: nextCityPosition.y }
          ).map((p) => this.grid[p.y][p.x].index);
  
          if (path) {
            realRoute.push(...path.map((p) => p));
            route.push(nextCity);
            visited[nextCity] = true;
            capacity -= this.demands[nextCity];
            currentCity = nextCity;
            currentCityPosition = nextCityPosition;
          } else {
            console.error(`Não foi possível encontrar um caminho de ${currentCity} para ${nextCity}.`);
            break;
          }
        }
  
        // Retornar ao depósito após esgotar a capacidade
        const returnPath = this.findPathAStar(
          this.grid,
          currentCityPosition,
          this.findPositionByIndex(depot)
        ).map((p) => this.grid[p.y][p.x].index);
  
        if (returnPath) {
          realRoute.push(...returnPath.map((p) => p).slice(1)); // Retornar ao depósito
        }
        allRoutes[vehicle] = route;
        allRealRoutes[vehicle] = realRoute;
  
        totalDistance += realRoute.length; // Usar o comprimento do caminho real
      }
  
      if (totalDistance < bestDistance) {
        bestDistance = totalDistance;
        bestRoutes = allRoutes;
        bestRealRoutes = allRealRoutes;
      }
  
      this.updatePheromonesVRP(allRoutes, totalDistance);
    }
  
    return { bestRoutes, bestDistance, bestRealRoutes };
  }

  updatePheromonesVRP(allRoutes, totalDistance) {
    // Evaporação dos feromônios
    for (let i = 0; i < this.numCities; i++) {
      for (let j = 0; j < this.numCities; j++) {
        this.pheromone[i][j] *= 1 - this.evaporation;
      }
    }

    // Adicionar feromônios com base nas rotas
    const contribution = 1 / totalDistance; // Contribuição proporcional ao custo total
    for (const route of allRoutes) {
      for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        this.pheromone[from][to] += contribution;
        this.pheromone[to][from] += contribution;
      }
    }
  }
}