import Contact from "../../models/Contact";

interface Request {
  companyId: number;
}

const ListContactsByStateService = async ({ companyId }: Request) => {
  const contacts = await Contact.findAll({
    where: { companyId },
    attributes: ["id", "name", "number", "state", "urlPicture"]
  });

  const result = {};

  contacts.forEach(c => {
    const uf = c.state || "Sem Estado";
    if (!result[uf]) result[uf] = [];
    result[uf].push(c);
  });

  return result;
};

export default ListContactsByStateService;
