import Contact from "../../models/Contact";
import { Op } from "sequelize";

interface Response {
  [key: string]: number;
}

const GetContactsMapService = async (companyId: number): Promise<Response> => {
  const contacts = await Contact.findAll({
    where: { companyId },
    attributes: ["state"]
  });

  const result: Response = {};

  contacts.forEach(contact => {
    const uf = (contact.state || "Não informado").toUpperCase();

    if (!result[uf]) result[uf] = 0;
    result[uf]++;
  });

  return result;
};

export default GetContactsMapService;
