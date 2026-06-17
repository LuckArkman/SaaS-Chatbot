import React from "react";
import { Typography } from "@mui/material";

const Title = (props) => {
  return (
    <Typography component="h2" variant="h6" color="primary" sx={{ fontWeight: 700, mb: 2 }}>
      {props.children}
    </Typography>
  );
};

export default Title;