// Utility functions for generating random data

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function randomBoolean(): boolean {
  return Math.random() > 0.5;
}

export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function randomEmail(): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'example.com'];
  const username = randomString(randomInt(5, 10));
  const domain = randomChoice(domains);
  return `${username}@${domain}`;
}

export function randomPhoneNumber(): string {
  const areaCode = randomInt(200, 999);
  const exchange = randomInt(200, 999);
  const number = randomInt(1000, 9999);
  return `${areaCode}-${exchange}-${number}`;
}

export function randomAddress(): string {
  const streetNumbers = randomInt(1, 9999);
  const streetNames = [
    'Main St', 'Oak Ave', 'Pine Rd', 'Cedar Ln', 'Maple Dr', 'Elm St', 'First Ave', 'Second St',
    'Park Ave', 'Washington St', 'Lincoln Ave', 'Jefferson Rd', 'Madison Dr', 'Monroe St'
  ];
  const cities = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
    'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus'
  ];
  const states = [
    'NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'OH', 'NC', 'GA', 'MI', 'NJ', 'VA', 'WA'
  ];
  
  const street = randomChoice(streetNames);
  const city = randomChoice(cities);
  const state = randomChoice(states);
  const zip = randomInt(10000, 99999);
  
  return `${streetNumbers} ${street}, ${city}, ${state} ${zip}`;
}

export function randomName(): string {
  const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
    'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen',
    'Charles', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra',
    'Donald', 'Donna', 'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle',
    'Kenneth', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah', 'Timothy', 'Dorothy'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
  ];
  
  const firstName = randomChoice(firstNames);
  const lastName = randomChoice(lastNames);
  
  return `${firstName} ${lastName}`;
}

export function randomCompanyName(): string {
  const prefixes = ['Acme', 'Global', 'Premier', 'Elite', 'Advanced', 'Dynamic', 'Innovative', 'Strategic'];
  const suffixes = ['Corp', 'Inc', 'LLC', 'Group', 'Solutions', 'Systems', 'Technologies', 'Enterprises'];
  const industries = ['Tech', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Services'];
  
  const prefix = randomChoice(prefixes);
  const industry = randomChoice(industries);
  const suffix = randomChoice(suffixes);
  
  return `${prefix} ${industry} ${suffix}`;
}

export function randomJobTitle(): string {
  const titles = [
    'Software Engineer', 'Data Scientist', 'Product Manager', 'UX Designer', 'Marketing Manager',
    'Sales Representative', 'Account Manager', 'Project Manager', 'Business Analyst', 'Operations Manager',
    'HR Specialist', 'Financial Analyst', 'Research Scientist', 'Consultant', 'Director',
    'VP of Engineering', 'CEO', 'CTO', 'CFO', 'VP of Marketing'
  ];
  
  return randomChoice(titles);
}

export function randomIndustry(): string {
  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Real Estate',
    'Entertainment', 'Media', 'Telecommunications', 'Transportation', 'Energy', 'Government',
    'Non-profit', 'Consulting', 'Legal', 'Insurance', 'Hospitality', 'Food & Beverage', 'Automotive'
  ];
  
  return randomChoice(industries);
}

export function randomCountry(): string {
  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
    'Sweden', 'Norway', 'Denmark', 'Finland', 'Australia', 'Japan', 'South Korea', 'China',
    'India', 'Brazil', 'Mexico', 'Argentina', 'Chile', 'South Africa', 'Nigeria', 'Egypt'
  ];
  
  return randomChoice(countries);
}

export function randomLanguage(): string {
  const languages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Chinese',
    'Japanese', 'Korean', 'Arabic', 'Hindi', 'Dutch', 'Swedish', 'Norwegian', 'Danish'
  ];
  
  return randomChoice(languages);
}

export function randomMusicGenre(): string {
  const genres = [
    'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Country', 'Jazz', 'Classical', 'Electronic', 'Folk',
    'Blues', 'Reggae', 'Punk', 'Metal', 'Indie', 'Alternative', 'Funk', 'Soul', 'Disco'
  ];
  
  return randomChoice(genres);
}

export function randomHobby(): string {
  const hobbies = [
    'Reading', 'Writing', 'Photography', 'Cooking', 'Gardening', 'Painting', 'Drawing', 'Music',
    'Sports', 'Hiking', 'Traveling', 'Gaming', 'Movies', 'TV Shows', 'Fitness', 'Yoga', 'Meditation',
    'Knitting', 'Woodworking', 'Pottery', 'Dancing', 'Singing', 'Playing Instruments', 'Collecting'
  ];
  
  return randomChoice(hobbies);
}

export function randomColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2', '#A9DFBF'
  ];
  
  return randomChoice(colors);
}

export function randomRating(min: number = 1, max: number = 5): number {
  return randomInt(min, max);
}

export function randomPercentage(): number {
  return randomInt(0, 100);
}

export function randomCurrency(amount: number = 1000): number {
  return Math.round(randomFloat(0, amount) * 100) / 100;
}

export function randomUrl(): string {
  const domains = ['example.com', 'test.org', 'demo.net', 'sample.co', 'mock.io'];
  const paths = ['', '/about', '/contact', '/products', '/services', '/blog', '/news'];
  const domain = randomChoice(domains);
  const path = randomChoice(paths);
  
  return `https://www.${domain}${path}`;
}

export function randomIpAddress(): string {
  return `${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
}

export function randomMacAddress(): string {
  const hex = '0123456789ABCDEF';
  let mac = '';
  for (let i = 0; i < 6; i++) {
    if (i > 0) mac += ':';
    mac += hex[Math.floor(Math.random() * 16)];
    mac += hex[Math.floor(Math.random() * 16)];
  }
  return mac;
}

export function randomUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function randomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function randomSentence(wordCount: number = 10): string {
  const words = [
    'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'cat', 'runs',
    'fast', 'slow', 'big', 'small', 'red', 'blue', 'green', 'yellow', 'happy', 'sad',
    'good', 'bad', 'new', 'old', 'hot', 'cold', 'warm', 'cool', 'bright', 'dark'
  ];
  
  const sentence = [];
  for (let i = 0; i < wordCount; i++) {
    sentence.push(randomChoice(words));
  }
  
  return sentence.join(' ').replace(/^./, c => c.toUpperCase()) + '.';
}

export function randomParagraph(sentenceCount: number = 3): string {
  const sentences = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(randomSentence(randomInt(5, 15)));
  }
  return sentences.join(' ');
}

