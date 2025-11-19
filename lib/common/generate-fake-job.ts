import { faker } from '@faker-js/faker';

// City to zip code mappings
const cityZipCodes: Record<string, string[]> = {
  'Jacksonville': ['32099', '32208', '32209', '32210', '32211', '32212', '32214', '32216', '32217', '32218', '32219', '32220', '32221', '32222', '32223', '32224', '32225', '32226', '32227', '32228', '32229'],
  'Miami': ['33101', '33102', '33103', '33104', '33105', '33106', '33107', '33109', '33110', '33111', '33112', '33113', '33114', '33115', '33116', '33122', '33125', '33126', '33127', '33128', '33129'],
  'Orlando': ['32801', '32802', '32803', '32804', '32805', '32806', '32807', '32808', '32809', '32810', '32811', '32812', '32813', '32814', '32815', '32816', '32817', '32818', '32819', '32820', '32821'],
  'Panama City': ['32401', '32402', '32403', '32404', '32405', '32406', '32407', '32408', '32409', '32410', '32411', '32412'],
  'Tampa': ['33602', '33603', '33604', '33605', '33606', '33607', '33609', '33610', '33611', '33612', '33613', '33614', '33615', '33616', '33617', '33618', '33619', '33620', '33621', '33622', '33623'],
};

const cities = Object.keys(cityZipCodes);

export function generateFakeJobData() {
  // Generate unique job number using timestamp + random suffix (max 50 characters)
  // Format: JOB-TIMESTAMP-RANDOM
  const timestamp = Date.now().toString();
  const randomSuffix = faker.string.alphanumeric(6).toUpperCase();
  const jobNumber = `JOB-${timestamp}-${randomSuffix}`;

  // Generate random street address
  const streetAddress = faker.location.streetAddress();

  // Select random city from the 5 options
  const city = faker.helpers.arrayElement(cities);

  // Select random zip code for the selected city
  const zipCode = faker.helpers.arrayElement(cityZipCodes[city]);

  // Generate start date - any date in the future not beyond Mar 1 2026
  const startDate = faker.date.between({
    from: new Date(),
    to: new Date(2026, 2, 1), // Mar 1 2026
  });

  // Format dates as YYYY-MM-DD for HTML date inputs
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // End date can be same as start date or one day after
  const endDate = new Date(startDate);
  if (faker.datatype.boolean()) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return {
    jobNumber,
    streetAddress,
    city,
    zipCode,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}
